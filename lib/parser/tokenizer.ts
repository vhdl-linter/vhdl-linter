export interface Token {
  type: string;
  value: string;
  offset: number;
}

class Tokenizer {
  readonly operators = [
    ['abs', 'not'],
    ['mod'],
    ['sll', 'srl', 'sla', 'sra', 'rol', 'ror'],
    ['and', 'or', 'nand', 'nor', 'xor', 'xnor'],
    ['downto', 'to', 'others', 'when', 'else']
  ];
  tokenTypes = [
    { regex: /^["]([^"\\\n]|\\.|\\\n)*["]/i, tokenType: 'STRING_LITERAL' },
    { regex: /^[*\/&\-?=<>+]+/i, tokenType: 'OPERATION'},
    { regex: /^\s+/i, tokenType: 'WHITESPACE' },
    { regex: /^[()]/i, tokenType: 'BRACE' },
    { regex: /^,/i, tokenType: 'COMMA' },
    { regex: /^[0-9]+/i, tokenType: 'INTEGER_LITERAL' },
    { regex: /^true|false/i, tokenType: 'BOOLEAN_LITERAL' },
    { regex: /^"[0-9]+"/i, tokenType: 'LOGIC_LITERAL' },
    { regex: /^x"[0-9A-F]+"/i, tokenType: 'LOGIC_LITERAL' },
    { regex: /^'[0-9]+'/i, tokenType: 'LOGIC_LITERAL' },
    { regex: /^\w+'\w+(?=\s*\()/i, tokenType: 'ATTRIBUTE_FUNCTION' },
    { regex: /^[a-z]\w*(?!\s*[(]|\w)/i, tokenType: 'VARIABLE' },
    { regex: /^\.[a-z]\w*(?!\s*[(]|\w)/i, tokenType: 'RECORD_ELEMENT' },
    { regex: /^\w+(?=\s*\()/i, tokenType: 'FUNCTION' },
    { regex: /^\.\w+(?=\s*\()/i, tokenType: 'FUNCTION_RECORD_ELEMENT' },
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
  tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    let foundToken;
    let offset = 0;
    do {
      foundToken = false;
      for (const tokenType of this.tokenTypes) {
        let match = tokenType.regex.exec(text);
        if (match) {
          const token: Token = { type: tokenType.tokenType, value: match[0], offset };
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