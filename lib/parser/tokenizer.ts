export interface Token {
  type: string;
  value: string;
  offset: number;
}
import * as escapeStringRegexp from 'escape-string-regexp';
class Tokenizer {
  readonly operators = [
    ['abs', 'not'],
    ['mod'],
    ['sll', 'srl', 'sla', 'sra', 'rol', 'ror'],
    ['and', 'or', 'nand', 'nor', 'xor', 'xnor'],
    ['downto', 'to', 'others', 'when', 'else', 'range', 'elsif', 'after', 'transport', 'reject', 'inertial', 'all'],
    ['of', 'new']
  ];
  tokenTypes = [
    { regex: /^(["])(([^"\\\n]|\\.|\\\n)*)["]/i, tokenType: 'STRING_LITERAL' },
    { regex: /^[*\/&\-?=<>+]+/i, tokenType: 'OPERATION'},
    { regex: /^\s+/i, tokenType: 'WHITESPACE' },
    { regex: /^[()]/i, tokenType: 'BRACE' },
    { regex: /^,/i, tokenType: 'COMMA' },
    { regex: /^[0-9_]+(?:\.[0-9_]+)?(?:e[+-]?[0-9_]+)?/i, tokenType: 'DECIMAL_LITERAL' },
    { regex: /^true|false/i, tokenType: 'BOOLEAN_LITERAL' },
    { regex: /^null/i, tokenType: 'NULL_LITERAL' },
    { regex: /^"[0-9ZWLH-UX]+"/i, tokenType: 'LOGIC_LITERAL' },
    { regex: /^\d*[su]?[box]"[0-9A-F_ZWLH-UX]+"/i, tokenType: 'LOGIC_LITERAL' },
    { regex: /^'[0-9ZWLH-UX]+'/i, tokenType: 'LOGIC_LITERAL' },
    { regex: /^\w+'\w+(?=\s*\()/i, tokenType: 'ATTRIBUTE_FUNCTION' },
    { regex: /^()([a-z]\w*)\s*(?=\=>)/i, tokenType: 'RECORD_ELEMENT' },
    { regex: /^[a-z]\w*(?!\s*[(]|\w)/i, tokenType: 'VARIABLE' },
    { regex: /^(\.)([a-z]\w*)(?!\s*[(]|\w)/i, tokenType: 'RECORD_ELEMENT' },
    { regex: /^\w+(?=\s*\()/i, tokenType: 'FUNCTION' },
    { regex: /^(\.)(\w+)(?=\s*\()/i, tokenType: 'FUNCTION_RECORD_ELEMENT' },
  ];
  constructor() {
    for (const operatorGroup of this.operators) {
      for (const operator of operatorGroup) {
        this.tokenTypes.unshift({
          regex: new RegExp('^' + operator + '\\b', 'i'),
          tokenType: 'KEYWORD',
        });
      }
    }

  }
  tokenize(text: string, libraries: string[]): Token[] {
    const tokens: Token[] = [];
    let foundToken;
    let offset = 0;
    const librariesSanitized = libraries.map(escapeStringRegexp);
    librariesSanitized.push('work');
    const librariesRegex = new RegExp('^(' + librariesSanitized.join('|') + ')\\..*?\\.', 'i');
    // console.log(librariesRegex);
    do {
      foundToken = false;
      const match = text.match(librariesRegex);
      if (match) {
        tokens.push({
          type: 'LIBRARY_PREFIX',
          value: match[0],
          offset
        });
        offset += match[0].length;
        text = text.substring(match[0].length);
      }
      for (const tokenType of this.tokenTypes) {
        let match = text.match(tokenType.regex);
        if (match) {
          const token: Token = { type: tokenType.tokenType, value: match[2] ? match[2] : match[0], offset: match[2] ? offset + match[1].length : offset };
          tokens.push(token);
          text = text.substring(match[0].length);
          offset += match[0].length;
          foundToken = true;
          break;
        }
      }
    } while (text.length > 0 && foundToken);
    // console.log(tokens);
    return tokens;
  }
}
export const tokenizer = new Tokenizer();