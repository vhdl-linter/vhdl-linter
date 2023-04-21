import { DiagnosticSeverity } from "vscode-languageserver";
import { OLexerToken, TokenType } from "../lexer";
import { ISettings } from "../settingsGenerated";
import { ParserError } from "./objects";
import { ParserState } from "./parserBase";

export class ConditionalParser {
  constructor(public tokens: OLexerToken[], public i: number, public settings: ISettings, public state: ParserState) {
    while (this.i < this.tokens.length) {
      if (this.getToken()?.getLText() === '`') {
        this.mask();
        if (this.getToken()?.getLText() === 'if') {
          this.mask();
          this.handleIf();
        } else {
          this.state.messages.push({
            message: `Unexpected tool directive '${this.getToken()?.text ?? ''}'`,
            range: this.getToken()!.range,
            severity: DiagnosticSeverity.Information
          });
          while (this.getToken()?.getLText() !== '`') {
            this.mask();
          }
          this.expect('`');

        }
      }
      this.increment();
    }
  }
  handleIf() {
    let conditionWasTrue = false;
    const condition = this.conditionalAnalysisExpression();
    if (condition) {
      conditionWasTrue = true;
    }
    this.expect('then');
    while (this.getToken()?.getLText() !== '`') {
      if (condition === false) {
        this.mask();
      } else {
        this.increment();
      }
    }
    this.mask();
    while (this.getToken()?.getLText() !== 'end') {
      if (this.getToken()?.getLText() === 'if') {
        this.mask();
        this.handleIf();
        while (this.getToken()?.getLText() !== '`') {
          if (condition === false) {
            this.mask();
          } else {
            this.increment();
          }
        }
        this.mask();
      } else if (this.getToken()?.getLText() === 'elsif') {
        this.mask();
        const condition = this.conditionalAnalysisExpression() && conditionWasTrue === false;
        if (condition) {
          conditionWasTrue = true;
        }
        this.expect('then');
        while (this.getToken()?.getLText() !== '`') {
          if (condition === false) {
            this.mask();
          } else {
            this.increment();
          }
        }
        this.expect('`');

      } else if (this.getToken()?.getLText() === 'else') {
        this.mask();
        while (this.getToken()?.getLText() !== '`') {
          if (conditionWasTrue === false) {
            this.increment();
          } else {
            this.mask();
          }
        }
        this.expect('`');
      } else {
        this.state.messages.push({
          message: `Unexpected tool directive '${this.getToken()?.text ?? ''}'`,
          range: this.getToken()!.range,
          severity: DiagnosticSeverity.Information
        });
        while (this.getToken()?.getLText() !== '`') {
          this.mask();
        }
        this.expect('`');
      }
    }
    this.expect('end');
    this.maybe('if');
  }
  expect(expectedString: string) {
    const token = this.getToken();
    if (!token) {
      throw new ParserError(`expected '${expectedString}' found EOF'`, this.tokens[this.i - 1]!.range);

    } else if (token.getLText() !== expectedString) {
      throw new ParserError(`expected '${expectedString}' found '${token.text ?? ''}'`, token.range);
    }
    this.mask();

  }
  maybe(expectedString: string) {
    if (this.getToken()?.getLText() === expectedString) {
      this.mask();
    }

  }
  conditionalAnalysisExpression(): boolean {
    let condition;
    if (this.getToken()?.getLText() === '(') {
      condition = this.conditionalAnalysisExpression();
      this.expect(')');
      this.increment();
    } else if (this.getToken()?.getLText() === 'not') {
      this.increment();
      return !this.conditionalAnalysisExpression();
    } else {
      const identifier = this.getToken()!.text;
      this.mask();
      const relationToken = this.getToken()!;
      const relation = this.getToken()!.text;
      this.mask();
      const literal = this.getToken()!.text.replace(/^"/, '').replace(/"$/, '');
      this.mask();
      const value = this.settings.analysis.conditionalAnalysis[identifier] ?? '';
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

    if (this.getToken()?.getLText() === 'and') {
      this.increment();
      condition = condition && this.conditionalAnalysisExpression();
    } else if (this.getToken()?.getLText() === 'or') {
      this.increment();
      condition = condition || this.conditionalAnalysisExpression();
    } else if (this.getToken()?.getLText() === 'xor') {
      const second = this.conditionalAnalysisExpression();
      condition = (condition && !second) || (!condition && second);
    } else if (this.getToken()?.getLText() === 'xnor') {
      const second = this.conditionalAnalysisExpression();
      condition = !((condition && !second) || (!condition && second));
    }

    return condition;
  }
  getToken() {
    return this.tokens[this.i];
  }
  increment() {
    this.i++;
    while (this.tokens[this.i]?.isWhitespace()) {
      this.i++;
    }
  }
  mask() {
    if (this.getToken()?.isWhitespace() === false) {
      this.tokens[this.i]!.text = ' '.repeat(this.tokens[this.i]!.text.length);
      this.tokens[this.i]!.type = TokenType.whitespace;
    }
    this.increment();
  }
}