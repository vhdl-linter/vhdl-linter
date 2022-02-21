import * as escapeStringRegexp from 'escape-string-regexp';
import { TextEdit } from 'vscode-languageserver';
import { config } from './config';
import { OAssociation, OAssociationFormal, ObjectBase, OElementRead, OGeneric, OI, OIRange, OPort, ORead, OWrite, ParserError } from './objects';
import { tokenizer } from './tokenizer';


export class ParserBase {
  constructor(protected text: string, protected pos: OI, protected file: string) {

  }
  debug(_message: string) {
    let pos = this.getPosition();
    if (config.debug) {
           console.log(`${this.constructor.name}: ${_message} at ${pos.line}:${pos.col}, (${this.file})`);
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
    while (this.text[this.pos.i].match(/[^);:]/) || braceLevel > 0) {
      type += this.text[this.pos.i];
      if (this.text[this.pos.i] === '(') {
        braceLevel++;
      } else if (this.text[this.pos.i] === ')') {
        braceLevel--;
      }
      this.pos.i++;
    }
    let defaultValue = '';
    const startI = this.pos.i + 2;
    if (this.text[this.pos.i] === ':') {
      this.pos.i += 2;
      while (this.text[this.pos.i].match(/[^);]/) || braceLevel > 0) {

        defaultValue += this.text[this.pos.i];
        if (this.text[this.pos.i] === '(') {
          braceLevel++;
        } else if (this.text[this.pos.i] === ')') {
          braceLevel--;
        }
        this.pos.i++;
      }
    }
    this.reverseWhitespace();
    const endI = this.pos.i;
    this.advanceWhitespace();
    if (this.text[this.pos.i] === ';') {
      const startI = this.pos.i;
      this.pos.i++;
      this.advanceWhitespace();
      if (this.text[this.pos.i] === ')') {
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
  advanceWhitespace() {
    const match = this.text.substring(this.pos.i).match(/^\s+/);
    if (match) {
      this.pos.i += match[0].length;
    }
    // while (this.text[this.pos.i] && this.text[this.pos.i].match(/\s/)) {
    //   this.pos.i++;
    // }
  }
  reverseWhitespace() {
    while (this.text[this.pos.i - 1] && this.text[this.pos.i - 1].match(/\s/)) {
      this.pos.i--;
    }
  }
  advancePast(search: string | RegExp, options: { allowSemicolon?: boolean, returnMatch?: boolean } = {}) {
    if (typeof options.allowSemicolon === 'undefined') {
      options.allowSemicolon = false;
    }
    if (typeof options.returnMatch === 'undefined') {
      options.returnMatch = false;
    }
    let text = '';
    let searchStart = this.pos;
    if (typeof search === 'string') {
      while (this.text.substr(this.pos.i, search.length).toLowerCase() !== search.toLowerCase()) {
        if (!options.allowSemicolon && this.text[this.pos.i] === ';') {
          throw new ParserError(`could not find ${search} DEBUG-SEMICOLON`, this.pos.getRangeToEndLine());
        }
        text += this.text[this.pos.i];
        this.pos.i++;
        if (this.pos.i > this.text.length) {
          throw new ParserError(`could not find ${search}`, searchStart.getRangeToEndLine());
        }
      }
      if (options.returnMatch) {
        text += search;
      }
      this.pos.i += search.length;
    } else {
      let match = this.text.substr(this.pos.i).match(search);
      if (match !== null && typeof match.index !== 'undefined') {
        if (!options.allowSemicolon && this.text.substr(this.pos.i, match.index).indexOf(';') > -1) {
          throw new ParserError(`could not find ${search} DEBUG-SEMICOLON`, searchStart.getRangeToEndLine());
        }
        // text = match[0];
        if (options.returnMatch) {
          text = this.text.substr(this.pos.i, match.index + match[0].length);
        } else {
          text = this.text.substr(this.pos.i, match.index);
        }
        this.pos.i += match.index + match[0].length;
      } else {
        throw new ParserError(`could not find ${search}`, searchStart.getRangeToEndLine());
      }
    }
    this.advanceWhitespace();
    return text.trim();
  }
  advanceBrace() {
    let text = '';
    let braceLevel = 0;
    let quote = false;
    const savedI = this.pos;
    while (this.text[this.pos.i]) {
      if (this.text[this.pos.i] === '"' && this.text[this.pos.i - 1] !== '"') {
        quote = !quote;
      } else if (this.text[this.pos.i] === '(' && !quote) {
        braceLevel++;
      } else if (this.text[this.pos.i] === ')' && !quote) {
        if (braceLevel > 0) {
          braceLevel--;
        } else {
          this.pos.i++;
          this.advanceWhitespace();
          return text.trim();
        }
      }
      text += this.text[this.pos.i];
      this.pos.i++;
    }
    throw new ParserError(`could not find closing brace`, savedI.getRangeToEndLine());
  }
  advanceBraceAware(searchStrings: string[], consume = true) {
    const savedI = this.pos;
    let braceLevel = 0;
    let result = '';
    while (this.text[this.pos.i]) {
      if (braceLevel === 0) {
        const found = searchStrings.find(s => s.toLowerCase() === this.text.substring(this.pos.i, this.pos.i + s.length).toLowerCase());
        if (typeof found !== 'undefined') {
          const lastString = found;
          if (consume) {
            this.pos.i += found.length;
            this.advanceWhitespace();
          }
          return [ result, lastString ];
        }
      }
      if (this.text[this.pos.i] === '(') {
        braceLevel++;
      } else if (this.text[this.pos.i] === ')') {
        braceLevel--;
      }
      result += this.text[this.pos.i];
      this.pos.i++;
    }
    throw new ParserError(`could not find ${searchStrings}`, savedI.getRangeToEndLine());
  }
  advanceSemicolon(braceAware: boolean = false, {consume} = {consume: true}) {
    if (braceAware) {
      let offset = 0;
      let text = '';
      let braceLevel = 0;
      let quote = false;
      const savedI = this.pos;
      while (this.text[this.pos.i + offset]) {
        const match = /[\\();]|(?<!")(?:"")*"(?!")/.exec(this.text.substring(this.pos.i + offset));
        if (!match) {
          throw new ParserError(`could not find closing brace`, savedI.getRangeToEndLine());
        }
        if (match[0][0] === '"' && this.text[this.pos.i + offset + match.index - 1] !== '\\') {
          quote = !quote;
        } else if (match[0] === '(' && !quote) {
          braceLevel++;
        } else if (match[0] === ')' && !quote) {
          if (braceLevel > 0) {
            braceLevel--;
          } else {
            throw new ParserError(`unexpected ')'`, new OI(this.pos.parent, this.pos.i - text.length).getRangeToEndLine());
          }
        } else if (match[0] === ';' && !quote && braceLevel === 0) {
          text += this.text.substring(this.pos.i + offset, this.pos.i + offset + match.index);
          offset += match.index + 1;
          if (consume) {
            this.pos.i += offset;
            this.advanceWhitespace();
          }
          return text.trim();
        }
        text += this.text.substring(this.pos.i + offset, this.pos.i + offset + match.index + match[0].length - 1);
        offset += match.index + match[0].length;
      }
      throw new ParserError(`could not find closing brace`, savedI.getRangeToEndLine());
    }
    const match = /;/.exec(this.text.substring(this.pos.i));
    if (!match) {
      throw new ParserError(`could not find semicolon`, this.pos.getRangeToEndLine());
    }
    const text = this.text.substring(this.pos.i, this.pos.i + match.index);
    if (consume) {
      this.pos.i += match.index + 1;
      this.advanceWhitespace();
    }
    return text;
  }
  test(re: RegExp) {
    return re.test(this.text.substring(this.pos.i));
  }
  getNextWord(options: { re?: RegExp, consume?: boolean } = {}) {
    let { re, consume } = options;
    if (!re) {
      re = /^\w+/;
    }
    if (typeof consume === 'undefined') {
      consume = true;
    }

    if (consume) {
      let word = '';
      const match = this.text.substring(this.pos.i).match(re);
      if (match) {
        word = match[0];
        this.pos.i += word.length;
        this.advanceWhitespace();
        return word;
      }
      throw new ParserError(`did not find ${re}. EOF line: ${this.getLine()}`, this.pos.getRangeToEndLine());
    }
    let word = '';
    let j = 0;
    while (this.text[this.pos.i + j].match(re)) {
      word += this.text[this.pos.i + j];
      j++;
    }
    return word;
  }

  getLine(position?: number) {
    if (!position) {
      position = this.pos.i;
    }
    let line = 1;
    for (let counter = 0; counter < position; counter++) {
      if (this.text[counter] === '\n') {
        line++;
      }
    }
    return line;
  }
  getEndOfLineI(position?: number) {
    if (!position) {
      position = this.pos.i;
    }
    while (this.text[position] !== '\n') {
      position++;
    }
    return position - 1;
  }
  getPosition(position?: number) {
    if (!position) {
      position = this.pos.i;
    }
    let line = 1;
    let col = 1;
    for (let counter = 0; counter < position; counter++) {
      col++;
      if (this.text[counter] === '\n') {
        line++;
        col = 1;
      }
    }
    return { line, col };
  }
  expect(expected: string | string[]) {
    if (!Array.isArray(expected)) {
      expected = [expected];
    }
    let savedI: number;
    const re = new RegExp('^' + expected.map(e => escapeStringRegexp(e)).join('|'), 'i');
    // console.log(re);
    const match = re.exec(this.text.substr(this.pos.i));
    if (match !== null) {
      this.pos.i += match[0].length;
      savedI = this.pos.i;
      this.advanceWhitespace();
    } else {
      throw new ParserError(`expected '${expected.join(', ')}' found '${this.getNextWord({re: /^\S+/})}' line: ${this.getLine()}`, this.pos.getRangeToEndLine());
    }
    return savedI;
  }
  maybeWord(expected: string) {
    const word = this.text.substr(this.pos.i, expected.length);
    if (word.toLowerCase() === expected.toLowerCase()) {
      this.pos.i += word.length;
      this.advanceWhitespace();
    }
  }
  getType(parent: ObjectBase, advanceSemicolon = true, endWithBrace = false) {
    let type = '';
    const startI = this.pos.i;
    if (endWithBrace) {
      [type] = this.advanceBraceAware([';', ' is', ')'], false);
    } else {
      const match = /;|\bis\b/.exec(this.text.substr(this.pos.i));
      if (!match) {
        throw new ParserError(`could not find semicolon`, this.pos.getRangeToEndLine());
      }
      type = this.text.substr(this.pos.i, match.index);
      this.pos.i += match.index;
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
  extractReads(parent: ObjectBase | OAssociation, text: string, i: number, asMappingName: boolean = false): ORead[] {
    return tokenizer.tokenize(text, parent.getRoot().libraries).filter(token => token.type === 'VARIABLE' || token.type === 'FUNCTION' || token.type === 'RECORD_ELEMENT' || token.type === 'FUNCTION_RECORD_ELEMENT').map(token => {
      let read;
      if (token.type === 'RECORD_ELEMENT' || token.type === 'FUNCTION_RECORD_ELEMENT') {
        read = new OElementRead(parent, i + token.offset, i + token.offset + token.value.length, token.value);
      } else {
        if (asMappingName && !(parent instanceof OAssociation)) {
          throw new Error();
        }
        read = asMappingName
        ? new OAssociationFormal((parent as OAssociation), i + token.offset, i + token.offset + token.value.length, token.value)
        : new ORead(parent, i + token.offset, i + token.offset + token.value.length, token.value);
      }
      return read;
    });
  }
  extractReadsOrWrite(parent: ObjectBase, text: string, i: number): [ORead[], OWrite[]] {
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
