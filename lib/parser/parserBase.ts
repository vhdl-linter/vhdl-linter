import { fileURLToPath } from 'url';
import { OLexerToken, TokenType } from '../lexer';
import { OIDiagnosticWithSolution } from '../vhdlLinter';
import { config } from './config';
import { ExpressionParser } from './expressionParser';
import { ObjectBase, OFile, OIRange, OReference, OSelectedName, ParserError } from './objects';


export class ParserPosition {
  public lexerTokens: OLexerToken[];
  public file: OFile;
  public num = 0;
  public get i() {
    const token = this.lexerTokens[this.num];
    if (!token) {
      throw new ParserError(`I out of range`, this.lexerTokens[this.lexerTokens.length - 1]!.range);
    }
    return token.range.start.i;
  }
  public isLast() {
    return this.num === this.lexerTokens.length - 1;
  }
  public isValid() {
    return this.num >= 0 && this.num < this.lexerTokens.length;
  }
  /**
 * @deprecated The method should not be used. Call range.copyExtendEndOfLine)_ directly on the appropriate token.
 */
  public getRangeToEndLine() {
    const currentToken = this.lexerTokens[this.num];
    if (currentToken === undefined) {
      const lastToken = this.lexerTokens[this.lexerTokens.length - 1];
      if (lastToken) {
        throw new ParserError(`EOF reached when getRangeToEndLine() called`, lastToken.range.copyExtendEndOfLine());
      } else {
        throw new ParserError(`getRangeToEndLine called on empty file`, new OIRange(this.file, 0, 0));

      }
    }
    return currentToken.range.copyExtendEndOfLine();
  }
}

export class ParserState {
  public messages: OIDiagnosticWithSolution[] = [];
  constructor(public pos: ParserPosition, public fileUri: URL) { }
}

export class ParserBase {
  constructor(protected state: ParserState) {

  }
  debug(_message: string) {
    if (config.debug) {
      const pos = this.getPosition();
      console.log(`${this.constructor.name}: ${_message} at ${pos.line}:${pos.col}, (${fileURLToPath(this.state.fileUri)})`);
    }
  }


  // Offset gives an offset to the current parser position. If offsetIgnoresWhitespaces is set whitespace (and comment) is not counted.
  // Meaning offset = 2 counts only the next two non-whitespaces tokens
  getToken(offset = 0, offsetIgnoresWhitespaces = false): OLexerToken {
    if (!this.state.pos.isValid()) {
      throw new ParserError(`EOF reached`, this.state.pos.lexerTokens[this.state.pos.lexerTokens.length - 1]!.range);
    }
    if (offsetIgnoresWhitespaces) {
      let offsetCorrected = 0;
      if (offset > 0) {
        for (let i = 0; i < offset; i++) {
          do {
            offsetCorrected += 1;
            if (this.state.pos.num + offsetCorrected >= this.state.pos.lexerTokens.length) {
              throw new ParserError(`Out of bound while doing getToken(${offset}, ${String(offsetIgnoresWhitespaces)})`, this.getToken(0).range);
            }
          } while ((this.state.pos.lexerTokens[this.state.pos.num + offsetCorrected]?.isWhitespace()));
        }
      } else if (offset < 0) {
        for (let i = 0; i > offset; i--) {
          do {
            offsetCorrected -= 1;
            if (this.state.pos.num + offsetCorrected >= this.state.pos.lexerTokens.length) {
              throw new ParserError(`Out of bound while doing getToken(${offset}, ${String(offsetIgnoresWhitespaces)})`, this.getToken(0).range);
            }
          } while ((this.state.pos.lexerTokens[this.state.pos.num + offsetCorrected]?.isWhitespace()));
        }
      } else if (offset === 0) {
        return this.state.pos.lexerTokens[this.state.pos.num]!;
      }
      const token = this.state.pos.lexerTokens[this.state.pos.num + offsetCorrected];
      if (!token) {
        throw new ParserError(`Out of bound`, this.getToken(0).range);
      }
      return token;
    } else {
      const token = this.state.pos.lexerTokens[this.state.pos.num + offset];
      if (!token) {
        throw new ParserError(`Out of bound`, this.getToken(0).range);
      }
      return token;

    }
  }
  advanceSelectedName(parent: ObjectBase): [OReference, ...OSelectedName[]] {
    const tokens: OLexerToken[] = [];
    while (this.getToken().isIdentifier() || this.getToken().getLText() === '.' || this.getToken().getLText() === 'all') {
      tokens.push(this.getToken());
      this.consumeToken();
    }
    if (tokens.length === 0) {
      throw new ParserError('expected a selected name', this.getToken().range);
    }
    return new ExpressionParser(this.state, parent, tokens).parse() as [OReference, ...OSelectedName[]];
  }
  consumeToken(advanceWhitespace = true): OLexerToken {
    const token = this.state.pos.lexerTokens[this.state.pos.num];
    this.state.pos.num++;
    if (advanceWhitespace) { // This should not be necessary anymore, if everything is correctly using tokens
      this.advanceWhitespace();
    }
    if (!token) {
      const lastToken = this.state.pos.lexerTokens[this.state.pos.lexerTokens.length - 1]!;
      throw new ParserError(`EOF reached`, lastToken.range);

    }

    return token;
  }
  consumeIdentifier(advanceWhitespace = true) {
    const token = this.consumeToken(advanceWhitespace);
    if (token.isIdentifier() === false) {
      throw new ParserError(`Expected valid identifier got ${token.text} (type: ${TokenType[token.type]})`, token.range);
    }
    return token;
  }
  findToken(options: string | string[]) {
    const startToken = this.getToken();
    if (!Array.isArray(options)) {
      options = [options];
    }
    options = options.map(a => a.toLowerCase());
    function checkToken(token: OLexerToken) {
      for (const option of options) {
        if (token.text.toLowerCase() === option) {
          return true;
        }
      }
      return false;
    }
    while (checkToken(this.state.pos.lexerTokens[this.state.pos.num]!) === false) {
      this.state.pos.num++;
      if (this.state.pos.num === this.state.pos.lexerTokens.length) {
        throw new ParserError(`stuck searching for ${options.join(', ')}`, startToken.range);
      }
    }
  }
  advanceWhitespace() {
    while (this.state.pos.isValid() && this.getToken().isWhitespace()) {
      this.state.pos.num++;
    }
  }
  reverseWhitespace() {
    while (this.getToken().isWhitespace()) {
      this.state.pos.num--;
    }
  }
  advanceParenthesisAware(searchStrings: (string)[], consume = true, consumeLastToken = true): [OLexerToken[], OLexerToken] {
    searchStrings = searchStrings.map(str => str.toLowerCase());
    const savedI = this.state.pos;
    let parenthesisLevel = 0;
    const tokens = [];
    let offset = 0;
    while (this.state.pos.isValid()) {
      if (parenthesisLevel === 0) {
        let found;
        for (const searchString of searchStrings) {
          if (searchString.toLowerCase() === this.getToken(offset).getLText()) {
            found = searchString;
            break;
          }
        }
        if (typeof found !== 'undefined') {
          const lastToken = this.getToken(offset);
          if (consume) {
            this.state.pos.num += offset;
            if (consumeLastToken) {
              this.consumeToken();
            }
          }
          return [tokens.filter(token => token.isWhitespace() === false), lastToken];
        }
      }
      if (this.getToken(offset).getLText() === '(') {
        parenthesisLevel++;
      } else if (this.getToken(offset).getLText() === ')') {
        parenthesisLevel--;
      }
      tokens.push(this.getToken(offset));
      offset++;
    }
    throw new ParserError(`could not find ${searchStrings.join(',')}`, savedI.getRangeToEndLine());
  }
  advanceSemicolon(consume = true) {
    return this.advanceParenthesisAware([';'], consume)[0];
  }

  getLine() {
    return this.getToken().range.start.line;
  }
  getEndOfLineI() {
    return this.state.pos.getRangeToEndLine().end.i;
  }
  getPosition() {
    const pos = this.getToken().range.start;
    return { line: pos.line, col: pos.character };
  }
  expect(expected: string | string[]) {
    if (!Array.isArray(expected)) {
      expected = [expected];
    }
    if (expected.find(exp => exp.toLowerCase() === this.getToken().getLText())) {
      const token = this.consumeToken(false);
      this.advanceWhitespace();
      return token;
    } else {
      throw new ParserError(`expected ${expected.join(', ')} found '${this.getToken().text}'`, this.state.pos.getRangeToEndLine());
    }
  }
  maybe(expected: (string | OLexerToken)[] | string | OLexerToken): OLexerToken | undefined {
    if (expected === undefined) {
      return undefined;
    }
    if (Array.isArray(expected)) {
      for (const expectedElement of expected) {
        const text = (typeof expectedElement === 'string') ? expectedElement.toLowerCase() : expectedElement.getLText();
        if (this.getToken().getLText() === text) {
          const token = this.consumeToken();
          return token;
        }
      }
      return undefined;
    } else {

      const text = (typeof expected === 'string') ? expected.toLowerCase() : expected.getLText();
      if (this.getToken().getLText() === text) {
        const token = this.consumeToken();
        return token;
      }
      return undefined;
    }
  }


  getTextDebug(lines = 3) { // This gets the current Text (for Debugger)
    let text = '';
    let i = 0;
    const re = /\n/g;
    while (Array.from(text.matchAll(re)).length < lines) {
      try {
        text += this.getToken(i);
      } catch (err) {
        if (err instanceof ParserError) {
          return text;
        }
        throw err;
      }
      i++;
    }
    return text;

  }
}
