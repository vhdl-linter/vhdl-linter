import {ParserPosition} from './parser-position';
const escapeStringRegexp = require('escape-string-regexp');

export interface Token {
  type: string;
  value: string;
};
export class ParserBase {
  start: number;
  end: number;
  constructor(protected text: string, protected pos: ParserPosition, protected file: string) {

  }
  debug(message: string)  {
      console.log(`${this.constructor.name}: ${message} in line: ${this.getLine()}, (${this.file})`);
  }
  message(message: string, severity = 'error') {
    if (severity == 'error') {
      throw new Error(message + ` in line: ${this.getLine()}`);
    } else {
    }
  }
  advanceWhitespace() {
    while (this.text[this.pos.i] && this.text[this.pos.i].match(/\s/)) {
      this.pos.i++;
    }
  }
  reverseWhitespace() {
    while (this.text[this.pos.i - 1] && this.text[this.pos.i - 1].match(/\s/)) {
      this.pos.i--;
    }
  }
  advancePast(search: string) {
    let string = '';
    while (this.text.substr(this.pos.i, search.length) !== search) {
      string += this.text[this.pos.i];
      this.pos.i++;
      if (this.pos.i > this.text.length) {
        throw new Error(`could not find ${search}`);
      }
    }
    this.pos.i += search.length;
    this.advanceWhitespace();
    return string.trim();
  }
  advanceSemicolon() {
    let text = '';
    while (this.text[this.pos.i].match(/[^;]/)) {
      text += this.text[this.pos.i];
      this.pos.i++;
    }
    this.pos.i++;
    this.advanceWhitespace();
    return text;
  }
  getNextWord(options: {re?: RegExp, consume?: boolean} = {}) {
    let {re, consume} = options;
    if (!re) {
      re = /\w/;
    }
    if (typeof consume === 'undefined') {
      consume = true;
    }
    if (consume) {
      let word = ''
      while (this.text[this.pos.i].match(re)) {
        word += this.text[this.pos.i];
        this.pos.i++;
      }
      this.advanceWhitespace();
      return word;
    }
    let word = '';
    let j = 0;
    while (this.text[this.pos.i + j].match(re)) {
      word += this.text[this.pos.i + j];
      j++;
    }
    return word;
  }
  getLine() {
    let line = 1;
    for (let counter = 0; counter < this.pos.i; counter++) {
      if (this.text[counter] == '\n') {
        line++;
      }
    }
    return line;
  }
  expect(expected: string) {
    const word = this.text.substr(this.pos.i, expected.length);
    if (word !== expected) {
      throw new Error(`expected '${expected}' found '${word}' line: ${this.getLine()}`);
    }
    this.pos.i += word.length;
    this.advanceWhitespace();
  }
  maybeWord(expected: string) {
    const word = this.text.substr(this.pos.i, expected.length);
    if (word.toLowerCase() === expected.toLowerCase()) {
      this.pos.i += word.length;
      this.advanceWhitespace();
    }
  }
  getType() {
    let type = '';
    while (this.text[this.pos.i].match(/[^;]/)) {
      type += this.text[this.pos.i];
      this.pos.i++;
    }
    this.expect(';');
    this.advanceWhitespace();
    return type;
  }
  tokenize(text: string): Token[] {
    const operators = [
      ['**', 'abs', 'not'],
      ['*', '/'],
      ['+', '-'],
      ['+', '-', '&'],
      ['sll', 'srl', 'sla', 'sra', 'rol', 'ror'],
      ['=', '/=', '<=', '>', '>=', '?=', '?/=', '?<', '?<=', '?>', '?>='],
      ['and', 'or', 'nand', 'nor', 'xor', 'xnor'],
      ['downto', 'to']
    ];
    const tokenTypes = [
      { regex: /^\s+/, tokenType: 'WHITESPACE' },
      { regex: /^[()]/, tokenType: 'BRACE' },
      { regex: /^,/, tokenType: 'COMMA' },
      { regex: /^[0-9]+/, tokenType: 'INTEGER_LITERAL'},
      { regex: /^"[0-9]+"/, tokenType: 'LOGIC_LITERAL'},
      { regex: /^x"[0-9A-F]+"/i, tokenType: 'LOGIC_LITERAL'},
      { regex: /^'[0-9]+'/, tokenType: 'LOGIC_LITERAL'},
      { regex: /^[a-z]\w+(?!\s*[(])/, tokenType: 'VARIABLE'},
      { regex: /^\w+(?=\s*\()/, tokenType: 'FUNCTION'},

    ];
    const specialChars = '[*/&-?=<>+]';
    for (const operatorGroup of operators) {
      for (const operator of operatorGroup) {
        if (operator.match(/[^a-z]/i)) {
          tokenTypes.unshift({
            regex: new RegExp('^' + escapeStringRegexp(operator) + '(?!\s*'+ specialChars + ')'),
            tokenType: 'OPERATION',
          });
        } else {
          tokenTypes.unshift({
            regex: new RegExp('^\\b' + operator + '\\b', 'i'),
            tokenType: 'OPERATION',
          });

        }
      }
    }
    // console.log(tokenTypes);
    const tokens = [];
    let foundToken;
    do {
      foundToken = false;
      for (const tokenType of tokenTypes) {
        let match = tokenType.regex.exec(text);
        if (match) {
          const token: Token = { type: tokenType.tokenType, value: match[0] };
          tokens.push(token);
          text = text.substring(match[0].length);
          foundToken = true;
          break;
        }
      }
    } while (text.length > 0 && foundToken);

    return tokens;
  }
}
