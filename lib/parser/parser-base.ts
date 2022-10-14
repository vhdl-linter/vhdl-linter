import { TextEdit } from 'vscode-languageserver';
import { config } from './config';
import { OAssociation, OAssociationFormal, ObjectBase, OElementRead, OGeneric, OIRange, OPort, ORead, OWrite, ParserError } from './objects';
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
    const [type, last] = this.advanceBraceAwareToken([')', ';', ':='], true, false);
    let defaultValue: OLexerToken[] = [];
    if (last.getLText() === ':=') {
      this.consumeToken();
      [defaultValue] = this.advanceBraceAwareToken([')', ';'], true, false);
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
          do  {
            offsetCorrected += 1;
            if (this.pos.lexerTokens[this.pos.num + offsetCorrected] === undefined) {
              throw new ParserError(`Out of bound while doing getToken(${offset}, ${offsetIgnoresWhitespaces})`, this.getToken(0).range);
            }
          } while ((this.pos.lexerTokens[this.pos.num + offsetCorrected].isWhitespace()));
        }
      } else if (offset < 0) {
        for (let i = 0; i > offset; i--) {
          do  {
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
  advancePastToken(search: string, options: { allowSemicolon?: boolean, returnMatch?: boolean, consume?: boolean } = {}) {
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
  advancePast(search: string, options: { allowSemicolon?: boolean, returnMatch?: boolean, consume?: boolean } = {}) {
    if (typeof options.allowSemicolon === 'undefined') {
      options.allowSemicolon = false;
    }
    if (typeof options.returnMatch === 'undefined') {
      options.returnMatch = false;
    }
    const text = this.advancePastToken(search, options).map(token => token.text).join(' ');
    return text.trim();
  }
  advanceBraceToken() {
    const tokens = [];
    let braceLevel = 0;
    const quote = false;
    const savedI = this.pos;
    while (this.pos.num < this.pos.lexerTokens.length) {
      if (this.getToken().getLText() === '(' && !quote) {
        braceLevel++;
      } else if (this.getToken().getLText() === ')' && !quote) {
        if (braceLevel > 0) {
          braceLevel--;
        } else {
          this.consumeToken();
          return tokens;
        }
      }
      tokens.push(this.consumeToken(false));
    }
    throw new ParserError(`could not find closing brace`, savedI.getRangeToEndLine());
  }
  advanceBrace() {
    return this.advanceBraceToken().map(token => token.text).join('');
  }
  advanceBraceAwareToken(searchStrings: (string)[], consume = true, consumeLastToken = true): [OLexerToken[], OLexerToken] {
    searchStrings = searchStrings.map(str => str.toLowerCase());
    const savedI = this.pos;
    let braceLevel = 0;
    const tokens = [];
    let offset = 0;
    while (this.pos.isValid()) {
      if (braceLevel === 0) {
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
        braceLevel++;
      } else if (this.getToken(offset).getLText() === ')') {
        braceLevel--;
      }
      tokens.push(this.getToken(offset));
      offset++;
    }
    throw new ParserError(`could not find ${searchStrings}`, savedI.getRangeToEndLine());
  }
  advanceBraceAware(searchStrings: (string)[], consume = true, consumeSearchString = true) {
    const [tokens, lastToken] = this.advanceBraceAwareToken(searchStrings, consume, consumeSearchString);
    return [
      tokens.map(token => token.text).join(''),
      lastToken.text
    ];
  }
  advanceSemicolon(braceAware = false, { consume } = { consume: true }) {
    return this.advanceSemicolonToken(braceAware, { consume }).map(token => token.text).join('');
  }
  advanceSemicolonToken(braceAware = false, { consume } = { consume: true }) {
    if (consume !== false) {
      consume = true;
    }
    if (braceAware) {
      return this.advanceBraceAwareToken([';'], consume)[0];
    }
    return this.advancePastToken(';', { consume });
  }
  getNextWord(options: { consume?: boolean } = {}) {
    const token = this.getToken();
    if (options.consume !== false) {
      this.pos.num++;
      this.advanceWhitespace();
    }
    return token.text;
    // let { re, consume } = options;
    // if (!re) {
    //   re = /^\w+/;
    // }
    // if (typeof consume === 'undefined') {
    //   consume = true;
    // }

    // if (consume) {
    //   let word = '';
    //   const match = this.text.substring(this.pos.i).match(re);
    //   if (match) {
    //     word = match[0];
    //     this.pos.i += word.length;
    //     this.advanceWhitespace();
    //     return word;
    //   }
    //   throw new ParserError(`did not find ${re}. EOF line: ${this.getLine()}`, this.pos.getRangeToEndLine());
    // }
    // let word = '';
    // let j = 0;
    // while (this.pos.i + j < this.text.length && this.text[this.pos.i + j].match(re)) {
    //   word += this.text[this.pos.i + j];
    //   j++;
    // }
    // return word;
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
      return token.range.end.i;
    } else {
      throw new ParserError(`expected '${expected.join(', ')}' found '${this.getToken().text}' line: ${this.getLine()}`, this.pos.getRangeToEndLine());
    }
  }
  expectToken(expected: string | string[]) {
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
  maybeWord(expected: string) {
    if (this.getToken().getLText() === expected.toLowerCase()) {
      this.consumeToken();
    }
  }
  getType(parent: ObjectBase, advanceSemicolon = true, endWithBrace = false) {
    let type;
    if (endWithBrace) {
      [type] = this.advanceBraceAwareToken([';', 'is', ')'], true, false);
    } else {
      [type] = this.advanceBraceAwareToken([';', 'is'], true, false);
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
  extractReads(parent: ObjectBase | OAssociation, tokens: OLexerToken[], asMappingName?: false): ORead[];
  extractReads(parent: ObjectBase | OAssociation, tokens: OLexerToken[], asMappingName: true): OAssociationFormal[];
  extractReads(parent: ObjectBase | OAssociation, tokens: OLexerToken[], asMappingName = false): (ORead | OAssociationFormal)[] {
    tokens = tokens.filter(token => !token.isWhitespace() && token.type !== TokenType.keyword);
    const libraries = parent.getRoot().libraries;
    libraries.push('work');
    const reads = [];
    let functionOrArraySlice = false;
    let braceLevel = 0;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (tokens[i].text === '(') {
        if (functionOrArraySlice) {
          braceLevel++;
        } else if (tokens[i - 1]?.isIdentifier()) {
          functionOrArraySlice = true;
          braceLevel++;
        }
      }
      if (tokens[i].text === ')') {
        if (braceLevel > 1) {
          braceLevel--;
        } else {
          functionOrArraySlice = false;
          braceLevel = 0;
        }
      }
      if (token.isIdentifier()) {
        if (tokens[i - 1]?.text === '\'') { // Attribute skipped for now
          continue;
        }
        if (tokens[i + 1]?.text === '.' && libraries.findIndex(l => l === token.getLText()) !== -1) {
          // skip library itself
          continue;
        }
        if (tokens[i - 1]?.text === '.' && libraries.findIndex(l => l === tokens[i - 2]?.getLText()) !== -1) {
          // skip package -> only read the actual variable
          continue;
        }
        // Detection if in possible function

        // If in possible function check if possible named function call, then ignore.
        if (functionOrArraySlice && tokens[i].isIdentifier() && tokens[i + 1]?.text === '=>') {
          continue;
        }
        if (tokens[i - 1]?.text === '.' && token.getLText() !== 'all') {
          reads.push(new OElementRead(parent, token));
        } else {
          if (asMappingName && !(parent instanceof OAssociation)) {
            throw new Error();
          }
          reads.push(asMappingName
            ? new OAssociationFormal((parent as OAssociation), token.range, token.text)
            : new ORead(parent, token));
        }
      }
    }
    return reads;
  }
  extractReadsOrWrite(parent: ObjectBase, tokens: OLexerToken[], readAndWrite = false): [ORead[], OWrite[]] {
    const reads: ORead[] = [];
    const writes: OWrite[] = [];
    let braceLevel = 0;
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
        braceLevel++;
      } else if (token.text === ')') {
        braceLevel--;
        if (braceLevel === 0) {
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
            reads.push(new OElementRead(parent, token));
          } else if (tokens[i - 1]?.text !== '\'') { // skip attributes
            reads.push(new ORead(parent, token));
          }
        }
      }
    }
    return [reads, writes];
  }
}
