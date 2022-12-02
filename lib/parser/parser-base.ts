import { config } from './config';
import { OLexerToken, TokenType } from '../lexer';
import { OIDiagnostic } from '../vhdl-linter';
import { OFile, ParserError, ObjectBase, ORead, OSelectedNameRead, OAssociation, OAssociationFormal, OAssociationFormalSelectedName, OWrite, OIDiagnosticWithSolution } from './objects';


export class ParserPosition {
  public lexerTokens: OLexerToken[];
  public file: OFile;
  public num = 0;
  public get i() {
    if (this.num >= this.lexerTokens.length) {
      throw new ParserError(`I out of range`, this.lexerTokens[this.lexerTokens.length - 1].range);
    }
    return this.lexerTokens[this.num].range.start.i;
  }
  public isLast() {
    return this.num === this.lexerTokens.length - 1;
  }
  public isValid() {
    return this.num >= 0 && this.num < this.lexerTokens.length;
  }
  public getRangeToEndLine() {
    return this.lexerTokens[this.num].range.copyExtendEndOfLine();
  }
}

export class ParserState {
  public messages: OIDiagnosticWithSolution[] = [];
  constructor(public pos: ParserPosition, public filePath: string) { }
}

export class ParserBase {
  constructor(protected state: ParserState) {

  }
  debug(_message: string) {
    if (config.debug) {
      const pos = this.getPosition();
      console.log(`${this.constructor.name}: ${_message} at ${pos.line}:${pos.col}, (${this.state.filePath})`);
    }
  }


  // Offset gives an offset to the current parser position. If offsetIgnoresWhitespaces is set whitespace (and comment) is not counted.
  // Meaning offset = 2 counts only the next two non-whitespaces tokens
  getToken(offset = 0, offsetIgnoresWhitespaces = false) {
    if (!this.state.pos.isValid()) {
      throw new ParserError(`EOF reached`, this.state.pos.lexerTokens[this.state.pos.lexerTokens.length - 1].range);
    }
    if (offsetIgnoresWhitespaces) {
      let offsetCorrected = 0;
      if (offset > 0) {
        for (let i = 0; i < offset; i++) {
          do {
            offsetCorrected += 1;
            if (this.state.pos.lexerTokens[this.state.pos.num + offsetCorrected] === undefined) {
              throw new ParserError(`Out of bound while doing getToken(${offset}, ${offsetIgnoresWhitespaces})`, this.getToken(0).range);
            }
          } while ((this.state.pos.lexerTokens[this.state.pos.num + offsetCorrected].isWhitespace()));
        }
      } else if (offset < 0) {
        for (let i = 0; i > offset; i--) {
          do {
            offsetCorrected -= 1;
            if (this.state.pos.lexerTokens[this.state.pos.num + offsetCorrected] === undefined) {
              throw new ParserError(`Out of bound while doing getToken(${offset}, ${offsetIgnoresWhitespaces})`, this.getToken(0).range);
            }
          } while ((this.state.pos.lexerTokens[this.state.pos.num + offsetCorrected].isWhitespace()));
        }
      } else if (offset === 0) {
        return this.state.pos.lexerTokens[this.state.pos.num];
      }
      if (this.state.pos.num + offsetCorrected < 0 || this.state.pos.num + offsetCorrected >= this.state.pos.lexerTokens.length) {
        throw new ParserError(`Out of bound`, this.getToken(0).range);
      }
      return this.state.pos.lexerTokens[this.state.pos.num + offsetCorrected];
    } else {
      if (this.state.pos.num + offset < 0 || this.state.pos.num + offset >= this.state.pos.lexerTokens.length) {
        throw new ParserError(`Out of bound`, this.getToken(0).range);
      }
      return this.state.pos.lexerTokens[this.state.pos.num + offset];

    }
  }
  consumeToken(advanceWhitespace = true) {
    const token = this.state.pos.lexerTokens[this.state.pos.num];
    this.state.pos.num++;
    if (advanceWhitespace) { // This should not be neccesary anymore, if everything is correctly using tokens
      this.advanceWhitespace();
    }
    return token;
  }
  findToken(options: string | string[]) {
    const start = this.state.pos.num;
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
    while (checkToken(this.state.pos.lexerTokens[this.state.pos.num]) === false) {
      this.state.pos.num++;
      if (this.state.pos.num === this.state.pos.lexerTokens.length) {
        throw new ParserError(`stuck searching for ${options.join(', ')}`, this.state.pos.lexerTokens[start].range);
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
  advancePast(search: string, options: { allowSemicolon?: boolean, returnMatch?: boolean, consume?: boolean } = {}) {
    if (typeof options.allowSemicolon === 'undefined') {
      options.allowSemicolon = false;
    }
    if (typeof options.returnMatch === 'undefined') {
      options.returnMatch = false;
    }
    if (typeof options.consume === 'undefined') {
      options.consume = true;
    }
    const tokens = [];
    search = search.toLowerCase();
    const searchStart = this.state.pos;

    while (this.getToken().getLText() !== search) {
      if (!options.allowSemicolon && this.getToken().getLText() === ';') {
        throw new ParserError(`could not find ${search} DEBUG-SEMICOLON`, this.state.pos.getRangeToEndLine());
      }
      tokens.push(this.consumeToken(false));
      if (this.state.pos.num >= this.state.pos.lexerTokens.length) {
        throw new ParserError(`could not find ${search}`, searchStart.getRangeToEndLine());
      }
    }
    if (options.consume) {
      if (options.returnMatch) {
        tokens.push(this.consumeToken());
      } else {
        this.consumeToken();
      }
      this.advanceWhitespace();
    } else {
      if (options.returnMatch) {
        tokens.push(this.getToken());
      }
    }
    return tokens;
  }
  advanceClosingParenthese() {
    const tokens = [];
    let parentheseLevel = 0;
    const savedI = this.state.pos;
    while (this.state.pos.num < this.state.pos.lexerTokens.length) {
      if (this.getToken().getLText() === '(') {
        parentheseLevel++;
      } else if (this.getToken().getLText() === ')') {
        if (parentheseLevel > 0) {
          parentheseLevel--;
        } else {
          this.consumeToken();
          return tokens;
        }
      }
      tokens.push(this.consumeToken(false));
    }
    throw new ParserError(`could not find closing parenthese`, savedI.getRangeToEndLine());
  }
  advanceParentheseAware(searchStrings: (string)[], consume = true, consumeLastToken = true): [OLexerToken[], OLexerToken] {
    searchStrings = searchStrings.map(str => str.toLowerCase());
    const savedI = this.state.pos;
    let parentheseLevel = 0;
    const tokens = [];
    let offset = 0;
    while (this.state.pos.isValid()) {
      if (parentheseLevel === 0) {
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
        parentheseLevel++;
      } else if (this.getToken(offset).getLText() === ')') {
        parentheseLevel--;
      }
      tokens.push(this.getToken(offset));
      offset++;
    }
    throw new ParserError(`could not find ${searchStrings}`, savedI.getRangeToEndLine());
  }
  advanceSemicolon(parentheseAware = false, { consume } = { consume: true }) {
    if (consume !== false) {
      consume = true;
    }
    if (parentheseAware) {
      return this.advanceParentheseAware([';'], consume)[0];
    }
    return this.advancePast(';', { consume });
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
      throw new ParserError(`expected '${expected.join(', ')}' found '${this.getToken().text}' line: ${this.getLine()}`, this.state.pos.getRangeToEndLine());
    }
  }
  maybe(expected: string | OLexerToken): OLexerToken | false {
    const text = (typeof expected === 'string') ? expected.toLowerCase() : expected.getLText();
    if (this.getToken().getLText() === text) {
      const token = this.consumeToken();
      return token;
    }
    return false;
  }
  getType(parent: ObjectBase, advanceSemicolon = true, endWithParenthese = false) {
    let type;
    if (endWithParenthese) {
      [type] = this.advanceParentheseAware([';', 'is', ')'], true, false);
    } else {
      [type] = this.advanceParentheseAware([';', 'is'], true, false);
    }
    let defaultValueReads;
    let typeReads;
    const index = type.findIndex(token => token.getLText() === ':=');
    if (index > -1) {
      const tokensDefaultValue = type.slice(index + 1);
      const typeTokens = type.slice(0, index);
      defaultValueReads = this.extractReads(parent, tokensDefaultValue);
      typeReads = this.extractReads(parent, typeTokens);
    } else {
      typeReads = this.extractReads(parent, type);

    }
    if (advanceSemicolon) {
      this.expect(';');
      this.advanceWhitespace();
    }
    return {
      typeReads,
      defaultValueReads
    };
  }
  consumeNameRead(parent: ObjectBase): ORead[] {
    const prefixTokens = [];
    const reads = [];
    do {
      const token = this.consumeToken();
      if (prefixTokens.length > 0) {
        reads.push(new OSelectedNameRead(parent, token, prefixTokens.slice(0)));
      } else {
        reads.push(new ORead(parent, token));
      }
      prefixTokens.push(token);
    } while (this.getToken().text === '.' && this.consumeToken());
    return reads;
  }
  extractReads(parent: ObjectBase | OAssociation, tokens: OLexerToken[], asMappingName?: false): ORead[];
  extractReads(parent: ObjectBase | OAssociation, tokens: OLexerToken[], asMappingName: true): OAssociationFormal[];
  extractReads(parent: ObjectBase | OAssociation, tokens: OLexerToken[], asMappingName = false): (ORead | OAssociationFormal)[] {
    tokens = tokens.filter(token => !token.isWhitespace() && token.type !== TokenType.keyword);
    const reads = [];
    let functionOrArraySlice = false;
    let parentheseLevel = 0;
    let prefixTokens: OLexerToken[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (tokens[i].text === '(') {
        if (functionOrArraySlice) {
          parentheseLevel++;
        } else if (tokens[i - 1]?.isIdentifier()) {
          functionOrArraySlice = true;
          parentheseLevel++;
        }
      }
      if (tokens[i].text === ')') {
        if (parentheseLevel > 1) {
          parentheseLevel--;
        } else {
          functionOrArraySlice = false;
          parentheseLevel = 0;
        }
      }
      if (token.isIdentifier()) {
        if (tokens[i - 1]?.text === '\'') { // Attribute skipped for now
          continue;
        }
        if (tokens[i + 1]?.text === '.' && tokens[i + 2]?.isIdentifier()) {
          prefixTokens.push(token);
          continue;
        }

        // Detection if in possible function

        // If in possible function check if possible named function call, then ignore.
        if (functionOrArraySlice && tokens[i].isIdentifier() && tokens[i + 1]?.text === '=>') {
          continue;
        }
        if (prefixTokens.length > 0) {
          for (const [index, token] of prefixTokens.entries()) {
            if (index > 0) {
              reads.push(asMappingName ? new OAssociationFormalSelectedName((parent as OAssociation), token, prefixTokens.slice(0, index))
                : new OSelectedNameRead(parent, token, prefixTokens.slice(0, index)));
            } else {
              reads.push(asMappingName
                ? new OAssociationFormal((parent as OAssociation), token)
                : new ORead(parent, token))
            }
          }
          reads.push(asMappingName ? new OAssociationFormalSelectedName((parent as OAssociation), token, prefixTokens)
            : new OSelectedNameRead(parent, token, prefixTokens));
          prefixTokens = [];
        } else {
          if (asMappingName && !(parent instanceof OAssociation)) {
            throw new Error();
          }
          reads.push(asMappingName
            ? new OAssociationFormal((parent as OAssociation), token)
            : new ORead(parent, token));
          prefixTokens = [];
        }
      }
    }
    return reads;
  }
  extractReadsOrWrite(parent: ObjectBase, tokens: OLexerToken[], readAndWrite = false): [ORead[], OWrite[]] {
    const reads: ORead[] = [];
    const writes: OWrite[] = [];
    let parentheseLevel = 0;
    tokens = tokens.filter(token => token.isWhitespace() === false && token.type !== TokenType.keyword);

    let slice = false;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      // console.log(index, token);
      const recordToken = tokens[i - 1]?.text === '.';
      if (token.text === '(') {
        if (i > 0) {
          slice = true;
        }
        parentheseLevel++;
      } else if (token.text === ')') {
        parentheseLevel--;
        if (parentheseLevel === 0) {
          slice = false;
        }
      } else if (token.isIdentifier()) {
        // If in possible function check if possible named function call, then ignore.
        if (slice && tokens[i + 1]?.text === '=>') {
          continue;
        }
        if (slice === false && recordToken === false) {
          if (tokens[i - 1]?.text === '\'') { // Attribute skipped for now
            continue;
          }
          if (readAndWrite) {
            reads.push(new ORead(parent, token));
          }
          if (tokens[i - 1]?.type === TokenType.decimalLiteral) { //  Skip units for writing
            continue;
          }
          const write = new OWrite(parent, token);
          writes.push(write);

        } else {

          if (recordToken) {
            const prefixTokens = [];
            let x = i - 1;
            while (tokens[x]?.text === '.') {
              prefixTokens.unshift(tokens[x - 1]);
              x = x - 2;
            }
            reads.push(new OSelectedNameRead(parent, token, prefixTokens));
          } else if (tokens[i - 1]?.text !== '\'') { // skip attributes
            reads.push(new ORead(parent, token));
          }
        }
      }
    }
    return [reads, writes];
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
