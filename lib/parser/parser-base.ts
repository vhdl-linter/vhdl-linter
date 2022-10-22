import { TextEdit } from 'vscode-languageserver';
import { config } from './config';
import { OAssociation, OAssociationFormal, ObjectBase, OSelectedNameRead, OGeneric, OIRange, OPort, ORead, OWrite, ParserError, OAssociationFormalSelectedName } from './objects';
import { ParserPosition } from './parser';
import { OLexerToken, TokenType } from '../lexer';


export class ParserBase {
  constructor(protected pos: ParserPosition, protected filePath: string) {

  }
  debug(_message: string) {
    if (config.debug) {
      const pos = this.getPosition();
      console.log(`${this.constructor.name}: ${_message} at ${pos.line}:${pos.col}, (${this.filePath})`);
    }
  }
  // debugObject(_object: any) {
  // let target: any = {};
  // const filter = (object: any) => {
  //   const target: any = {};
  //   if (!object) {
  //     return;
  //   }
  //   for (const key of Object.keys(object)) {
  //     if (key === 'parent') {
  //       continue;
  //     } else if (Array.isArray(object[key])) {
  //       target[key] = object[key].map(filter);
  //
  //     } else if (typeof object[key] === 'object') {
  //       target[key] = filter(object[key]);
  //     } else {
  //       target[key] = object[key];
  //     }
  //   }
  //   return target;
  // };
  // target = filter(object);
  //     console.log(`${this.constructor.name}: ${JSON.stringify(target, null, 2)} in line: ${this.getLine()}, (${this.file})`);
  // }
  getTypeDefintion(parent: OGeneric | OPort) {
    this.debug('getTypeDefintion');
    const [type, last] = this.advanceParentheseAware([')', ';', ':='], true, false);
    let defaultValue: OLexerToken[] = [];
    if (last.getLText() === ':=') {
      this.consumeToken();
      [defaultValue] = this.advanceParentheseAware([')', ';'], true, false);
    }
    this.reverseWhitespace();
    this.advanceWhitespace();
    if (this.getToken().text === ';') {
      const startI = this.pos.i;
      this.consumeToken();
      if (this.getToken().text === ')') {
        const range = new OIRange(parent, startI, startI + 1).copyExtendBeginningOfLine();
        throw new ParserError(`Unexpected ';' at end of port list`, range, {
          message: `Remove ';'`,
          edits: [TextEdit.del(new OIRange(parent, startI, startI + 1))]
        });
      }
    }
    if (defaultValue.length === 0) {
      return {
        type: type,

      };

    }
    return {
      type: type,
      defaultValue: this.extractReads(parent, defaultValue),
    };
  }
  message(message: string, severity = 'error') {
    if (severity === 'error') {
      throw new ParserError(message + ` in line: ${this.getLine()}`, this.pos.getRangeToEndLine());
    }
  }
  // Offset gives an offset to the current parser position. If offsetIgnoresWhitespaces is set whitespace (and comment) is not counted.
  // Meaning offset = 2 counts only the next two non-whitespaces tokens
  getToken(offset = 0, offsetIgnoresWhitespaces = false) {
    if (!this.pos.isValid()) {
      throw new ParserError(`EOF reached`, this.pos.lexerTokens[this.pos.lexerTokens.length - 1].range);
    }
    if (offsetIgnoresWhitespaces) {
      let offsetCorrected = 0;
      if (offset > 0) {
        for (let i = 0; i < offset; i++) {
          do {
            offsetCorrected += 1;
            if (this.pos.lexerTokens[this.pos.num + offsetCorrected] === undefined) {
              throw new ParserError(`Out of bound while doing getToken(${offset}, ${offsetIgnoresWhitespaces})`, this.getToken(0).range);
            }
          } while ((this.pos.lexerTokens[this.pos.num + offsetCorrected].isWhitespace()));
        }
      } else if (offset < 0) {
        for (let i = 0; i > offset; i--) {
          do {
            offsetCorrected -= 1;
            if (this.pos.lexerTokens[this.pos.num + offsetCorrected] === undefined) {
              throw new ParserError(`Out of bound while doing getToken(${offset}, ${offsetIgnoresWhitespaces})`, this.getToken(0).range);
            }
          } while ((this.pos.lexerTokens[this.pos.num + offsetCorrected].isWhitespace()));
        }
      } else if (offset === 0) {
        return this.pos.lexerTokens[this.pos.num];
      }
      if (this.pos.num + offsetCorrected < 0 || this.pos.num + offsetCorrected >= this.pos.lexerTokens.length) {
        throw new ParserError(`Out of bound`, this.getToken(0).range);
      }
      return this.pos.lexerTokens[this.pos.num + offsetCorrected];
    } else {
      if (this.pos.num + offset < 0 || this.pos.num + offset >= this.pos.lexerTokens.length) {
        throw new ParserError(`Out of bound`, this.getToken(0).range);
      }
      return this.pos.lexerTokens[this.pos.num + offset];

    }
  }
  consumeToken(advanceWhitespace = true) {
    const token = this.pos.lexerTokens[this.pos.num];
    this.pos.num++;
    if (advanceWhitespace) { // This should not be neccesary anymore, if everything is correctly using tokens
      this.advanceWhitespace();
    }
    return token;
  }
  findToken(options: string | string[]) {
    const start = this.pos.num;
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
    while (checkToken(this.pos.lexerTokens[this.pos.num]) === false) {
      this.pos.num++;
      if (this.pos.num === this.pos.lexerTokens.length) {
        throw new ParserError(`stuck searching for ${options.join(', ')}`, this.pos.lexerTokens[start].range);
      }
    }
  }
  advanceWhitespace() {
    while (this.pos.isValid() && this.getToken().isWhitespace()) {
      this.pos.num++;
    }
    // const match = this.text.substring(this.pos.i).match(/^\s+/);
    // if (match) {
    //   this.pos.i += match[0].length;
    // }
    // while (this.text[this.pos.i] && this.text[this.pos.i].match(/\s/)) {
    //   this.pos.i++;
    // }
  }
  reverseWhitespace() {
    while (this.getToken().isWhitespace()) {
      this.pos.num--;
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
    const searchStart = this.pos;

    while (this.getToken().getLText() !== search) {
      if (!options.allowSemicolon && this.getToken().getLText() === ';') {
        throw new ParserError(`could not find ${search} DEBUG-SEMICOLON`, this.pos.getRangeToEndLine());
      }
      tokens.push(this.consumeToken(false));
      if (this.pos.num >= this.pos.lexerTokens.length) {
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
    const quote = false;
    const savedI = this.pos;
    while (this.pos.num < this.pos.lexerTokens.length) {
      if (this.getToken().getLText() === '(' && !quote) {
        parentheseLevel++;
      } else if (this.getToken().getLText() === ')' && !quote) {
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
    const savedI = this.pos;
    let parentheseLevel = 0;
    const tokens = [];
    let offset = 0;
    while (this.pos.isValid()) {
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
            this.pos.num += offset;
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
    return this.pos.getRangeToEndLine().end.i;
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
      throw new ParserError(`expected '${expected.join(', ')}' found '${this.getToken().text}' line: ${this.getLine()}`, this.pos.getRangeToEndLine());
    }
  }
  maybe(expected: string|OLexerToken) {
    const text = (typeof expected === 'string') ? expected.toLowerCase() : expected.getLText();
    if (this.getToken().getLText() === text) {
      this.consumeToken();
      return true;
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
    // while (this.text[this.pos.i].match(/[^;]/)) {
    //   type += this.text[this.pos.i];
    //   this.pos.i++;
    // }
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
        if (slice === false && recordToken === false) {
          const write = new OWrite(parent, token);
          writes.push(write);
          if (readAndWrite) {
            reads.push(new ORead(parent, token));
          }
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
