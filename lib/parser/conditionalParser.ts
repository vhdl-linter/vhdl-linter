import { DiagnosticSeverity } from "vscode-languageserver";
import { OLexerToken, TokenType } from "../lexer";
import { ISettings } from "../settingsGenerated";
import { ParserError } from "./objects";
import { ParserState } from "./parserBase";

export class ConditionalParser {
  constructor(public tokens: OLexerToken[], public i: number, public settings: ISettings, public state: ParserState) {
    while (this.i < this.tokens.length) {
      if (this.getToken().getLText() === '`') {
        this.mask();
        if (this.getToken().getLText() === 'if') {
          this.mask();
          this.handleIf();
        } else if (['error', 'warning'].includes(this.getToken().getLText())) {
          this.handleWarningError();
        } else {
          this.handleUnknown();
        }
      } else {
        this.increment();
      }
    }
  }
  seekToolDirective(mask: boolean) {
    while (this.getToken().getLText() !== '`') {
      if (mask) {
        this.mask();
      } else {
        this.increment();
      }
    }
    this.mask();
  }
  handleIf() {
    let conditionWasTrue = false;
    const condition = this.conditionalAnalysisExpression();
    if (condition) {
      conditionWasTrue = true;
    }
    this.expect('then');
    this.seekToolDirective(!condition);
    while (this.getToken().getLText() !== 'end') {
      if (this.getToken().getLText() === 'if') {
        this.mask();
        this.handleIf();
        this.seekToolDirective(!condition);
      } else if (this.getToken().getLText() === 'elsif') {
        this.mask();
        const condition = this.conditionalAnalysisExpression() && conditionWasTrue === false;
        if (condition) {
          conditionWasTrue = true;
        }
        this.expect('then');
        this.seekToolDirective(!condition);
      } else if (this.getToken().getLText() === 'else') {
        this.mask();
        this.seekToolDirective(conditionWasTrue);
      } else if (['error', 'warning'].includes(this.getToken().getLText())) {
        this.handleWarningError(!condition);
        this.seekToolDirective(!condition);
      } else {
        this.handleUnknown();
        this.seekToolDirective(true);

      }
    }
    this.expect('end');
    this.maybe('if');
  }
  handleWarningError(masked = false) {
    const severityToken = this.getToken();
    const severityTokenText = this.getToken().text;
    const severity = severityToken.getLText() === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning;
    this.mask();
    const messageToken = this.getToken();
    const message = messageToken.text;
    this.mask();
    if (!masked) {
      this.state.messages.push({
        message: `Tool directive ${severityTokenText} ${message}`,
        severity,
        range: severityToken.range.copyWithNewEnd(messageToken.range)
      });
    }
  }
  handleUnknown() {
    this.state.messages.push({
      message: `Unknown tool directive '${this.getToken().text}'`,
      range: this.getToken().range,
      severity: DiagnosticSeverity.Information
    });
    let token = this.getToken();
    while ((token.isWhitespace() && token.getLText().includes('\n')) !== true) { // Do not use normal mask function here as it moves over the newline
      if (token.isWhitespace() !== true) {
        token.text = ' '.repeat(token.text.length);
        token.type = TokenType.whitespace;
      }
      this.i++;
      token = this.getToken();
    }
  }
  expect(expectedString: string) {
    const token = this.getToken();
    if (token.getLText() !== expectedString) {
      throw new ParserError(`expected '${expectedString}' found '${token.text ?? ''}'`, token.range);
    }
    this.mask();

  }
  maybe(expectedString: string) {
    if (this.getToken().getLText() === expectedString) {
      this.mask();
    }

  }
  conditionalAnalysisExpression(): boolean {
    let condition;
    if (this.getToken().getLText() === '(') {
      this.expect('(');
      condition = this.conditionalAnalysisExpression();
      this.expect(')');
    } else if (this.getToken().getLText() === 'not') {
      this.mask();
      return !this.conditionalAnalysisExpression();
    } else {
      const identifierToken = this.getToken();
      const identifier = identifierToken.text;
      this.mask();
      const relationToken = this.getToken();
      const relation = relationToken.text;
      this.mask();
      const literal = this.getToken().text.replace(/^"/, '').replace(/"$/, '');
      this.mask();
      const value = this.settings.analysis.conditionalAnalysis[identifier] ?? '';
      identifierToken.hoverInfo = `${identifier}: "${value}"`;
      if (relation === '=') {
        condition = value === literal;
      } else if (relation === '/=') {
        condition = value !== literal;
      } else if (relation === '<') {
        condition = value < literal;
      } else if (relation === '<=') {
        condition = value <= literal;
      } else if (relation === '>') {
        condition = value > literal;
      } else if (relation === '>=') {
        condition = value >= literal;
      } else {
        throw new ParserError(`Unknown relation '${relation}'`, relationToken.range);
      }
    }

    // The conditionalAnalysisExpression needs to come first because of lazy evaluation (and side effects)
    if (this.getToken().getLText() === 'and') {
      this.mask();
      condition = this.conditionalAnalysisExpression() && condition;
    } else if (this.getToken().getLText() === 'or') {
      this.mask();
      condition = this.conditionalAnalysisExpression() || condition;
    } else if (this.getToken().getLText() === 'xor') {
      this.mask();
      const second = this.conditionalAnalysisExpression();
      condition = (condition && !second) || (!condition && second);
    } else if (this.getToken().getLText() === 'xnor') {
      this.mask();
      const second = this.conditionalAnalysisExpression();
      condition = !((condition && !second) || (!condition && second));
    }

    return condition;
  }
  getToken() {
    const token = this.tokens[this.i];
    if (!token) {
      throw new ParserError(`EOF reached`, this.tokens[this.tokens.length - 1]!.range);
    }
    return token;
  }
  increment() {
    this.i++;
    while (this.tokens[this.i]?.isWhitespace()) {
      this.i++;
    }
  }
  mask() {
    const token = this.getToken();
    if (token.isWhitespace() !== true) {
      token.text = ' '.repeat(token.text.length);
      token.type = TokenType.whitespace;
    }
    this.increment();
  }
}