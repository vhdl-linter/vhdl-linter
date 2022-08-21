import * as escapeStringRegexp from 'escape-string-regexp';
import { TextEdit } from 'vscode-languageserver';
import { config } from './config';
import { OAssociation, OAssociationFormal, ObjectBase, OElementRead, OGeneric, OI, OIRange, OPort, ORead, OWrite, ParserError } from './objects';
import { tokenizer } from './tokenizer';
import { ParserPosition } from './parser';
import { OLexerToken } from '../lexer';


export class ParserBase {
  constructor(protected pos: ParserPosition, protected filePath: string) {

  }
  debug(_message: string) {
    if (config.debug) {
      let pos = this.getPosition();
      console.log(`${this.constructor.name}: ${_message} at ${pos.line}:${pos.col}, (${this.filePath})`);
    }
  }
  debugObject(_object: any) {
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
  }
  getTypeDefintion(parent: OGeneric | OPort) {
    this.debug('getTypeDefintion');
    let type = '';
    let braceLevel = 0;
    while (this.getToken().getLText().match(/[^);:]/) || braceLevel > 0) {
      if (this.getToken().text === '(') {
        braceLevel++;
      } else if (this.getToken().text === ')') {
        braceLevel--;
      }
      type += this.consumeToken(false);

    }
    let defaultValue = '';
    const startI = this.pos.i + 2;
    if (this.getToken().text === ':') {
      this.consumeToken();
      while (this.getToken().getLText().match(/[^);]/) || braceLevel > 0) {

        if (this.getToken().text === '(') {
          braceLevel++;
        } else if (this.getToken().text === ')') {
          braceLevel--;
        }
        defaultValue += this.consumeToken(false);
      }
    }
    this.reverseWhitespace();
    const endI = this.pos.i;
    this.advanceWhitespace();
    if (this.getToken().text === ';') {
      const startI = this.pos.i;
      this.consumeToken();
      if (this.getToken().text === ')') {
        const range = new OIRange(parent, startI, startI + 1);
        range.start.character = 0;
        throw new ParserError(`Unexpected ';' at end of port list`, range, {
          message: `Remove ';'`,
          edits: [TextEdit.del(new OIRange(parent, startI, startI + 1))]
        });
      }
    }
    defaultValue = defaultValue.trim();
    if (defaultValue === '') {
      return {
        type: type.trim(),
        endI
      };

    }
    return {
      type: type.trim(),
      defaultValue: this.extractReads(parent, defaultValue, startI),
      endI
    };
  }
  message(message: string, severity = 'error') {
    if (severity === 'error') {
      throw new ParserError(message + ` in line: ${this.getLine()}`, this.pos.getRangeToEndLine());
    } else {
    }
  }
  // Offset gives an offset to the current parser position. If offsetIgnoresWhitespaces is set whitespace (and comment) is not counted.
  // Meaning offset = 2 counts only the next two non-whitespaces tokens
  getToken(offset: number = 0, offsetIgnoresWhitespaces = false) {
    if (!this.pos.isValid()) {
      throw new ParserError(`EOF reached`, this.pos.lexerTokens[this.pos.lexerTokens.length - 1].range);
    }
    if (offsetIgnoresWhitespaces) {
      let offsetCorrected = 0;
      for (let i = 0; i < offset; i++) {
        offsetCorrected += 1;
        while (this.pos.lexerTokens[this.pos.num + offsetCorrected].isWhitespace()) {
          offsetCorrected += 1;
        }
      }
      return this.pos.lexerTokens[this.pos.num + offsetCorrected];
    } else {
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
    let start = this.pos.num;
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
    let tokens = [];
    search = search.toLowerCase();
    let searchStart = this.pos;

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
    let text = this.advancePastToken(search, options).map(token => token.text).join(' ');
    return text.trim();
  }
  advanceBraceToken() {
    const tokens = [];
    let braceLevel = 0;
    let quote = false;
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
          return [tokens, lastToken];
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
  advanceSemicolon(braceAware: boolean = false, { consume } = { consume: true }) {
    if (consume !== false) {
      consume = true;
    }
    if (braceAware) {
      return this.advanceBraceAware([';'], consume)[0];
    }
    return this.advancePast(';', { consume });
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
      this.consumeToken(false);
      const savedI = this.pos.i;
      this.advanceWhitespace();
      return savedI;
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
    let type = '';
    const startI = this.pos.i;
    if (endWithBrace) {
      [type] = this.advanceBraceAware([';', 'is', ')'], true, false);
    } else {
      [type] = this.advanceBraceAware([';', 'is'], true, false);
    }
    // while (this.text[this.pos.i].match(/[^;]/)) {
    //   type += this.text[this.pos.i];
    //   this.pos.i++;
    // }
    let defaultValueReads;
    let typeReads;
    if (type.indexOf(':=') > -1) {
      const split = type.split(':=');
      defaultValueReads = this.extractReads(parent, split[1].trim(), startI + type.indexOf(':=') + 2);
      typeReads = this.extractReads(parent, split[0].trim(), startI);
    } else {
      typeReads = this.extractReads(parent, type, startI);

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
  extractReads(parent: ObjectBase | OAssociation, text: string, i: number, asMappingName?: false): ORead[];
  extractReads(parent: ObjectBase | OAssociation, text: string, i: number, asMappingName: true): OAssociationFormal[];
  extractReads(parent: ObjectBase | OAssociation, text: string, i: number, asMappingName: boolean = false): ORead[] | OAssociationFormal[] {
    return tokenizer.tokenize(text, parent.getRoot().libraries).filter(token => token.type === 'VARIABLE' || token.type === 'FUNCTION' || token.type === 'RECORD_ELEMENT' || token.type === 'FUNCTION_RECORD_ELEMENT').map(token => {
      let read;
      if (token.type === 'RECORD_ELEMENT' || token.type === 'FUNCTION_RECORD_ELEMENT') {
        if (token.value.toLowerCase() !== 'all') {
          read = new OElementRead(parent, i + token.offset, i + token.offset + token.value.length, token.value);
        }
      } else {
        if (asMappingName && !(parent instanceof OAssociation)) {
          throw new Error();
        }
        read = asMappingName
          ? new OAssociationFormal((parent as OAssociation), i + token.offset, i + token.offset + token.value.length, token.value)
          : new ORead(parent, i + token.offset, i + token.offset + token.value.length, token.value);
      }
      return read;
    }).filter(a => a) as any;
  }
  extractReadsOrWrite(parent: ObjectBase, text: string, i: number, readAndWrite = false): [ORead[], OWrite[]] {
    const reads: ORead[] = [];
    const writes: OWrite[] = [];
    let braceLevel = 0;
    const tokens = tokenizer.tokenize(text, parent.getRoot().libraries);
    let index = 0;
    for (const token of tokens) {
      // console.log(index, token);
      if (token.type === 'BRACE' && index > 0) {
        token.value === '(' ? braceLevel++ : braceLevel--;
      } else if (token.type === 'VARIABLE' || token.type === 'FUNCTION' || token.type === 'RECORD_ELEMENT' || token.type === 'FUNCTION_RECORD_ELEMENT') {
        if (braceLevel === 0 && !(token.type === 'RECORD_ELEMENT' || token.type === 'FUNCTION_RECORD_ELEMENT')) {
          const write = new OWrite(parent, i + token.offset, i + token.offset + token.value.length, token.value);
          writes.push(write);
          if (readAndWrite) {
            const read = new ORead(parent, i + token.offset, i + token.offset + token.value.length, token.value);
            reads.push(read);
          }
        } else {
          let read;
          if (token.type === 'RECORD_ELEMENT' || token.type === 'FUNCTION_RECORD_ELEMENT') {
            read = new OElementRead(parent, i + token.offset, i + token.offset + token.value.length, token.value);
          } else {
            read = new ORead(parent, i + token.offset, i + token.offset + token.value.length, token.value);
          }
          reads.push(read);
        }
      }
      if (token.type !== 'WHITESPACE') {
        index++;
      }
    }
    return [reads, writes];
  }
}
