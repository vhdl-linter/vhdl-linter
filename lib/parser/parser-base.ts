import {ParserPosition} from './parser-position';
export class ParserBase {
  start: number;
  end: number;
  constructor(protected text: string, protected pos: ParserPosition) {

  }
  message(message: string, severity = 'error') {
    throw new Error(message + ` in line: ${this.getLine()}`);
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
}
