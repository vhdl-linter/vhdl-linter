import { OIRange, OFile, ParserError } from './parser/objects';

export class OLexerToken {
  constructor(
    public text: string,
    public range: OIRange,
    public type: string) {
  }
  isIdentifier() {
    return this.type === 'BASIC_IDENTIFIER' || this.type === 'EXTENDEND_IDENTIFIER';
  }
  isWhitespace() {
    return this.type === 'WHITESPACE' || this.type === 'COMMENT';
  }
  getLText() {
    return this.text.toLowerCase();
  }
  toString() {
    return this.getLText();
  }
}
export const GRAPHIC_CHARACTER = String.raw`[a-z0-9 "#&'()*+,-./:;<£¤¥¦§ ̈©ª«¬- ® ̄°±=>_|!$%?@\[\\\]\^\`{}~¡¢²³ ́μ¶· ̧¹º»¼½¾¿×÷]`;
export class Lexer {
  readonly keywords = [
    ['abs', 'not'],
    ['mod'],
    ['sll', 'srl', 'sla', 'sra', 'rol', 'ror'],
    ['and', 'or', 'nand', 'nor', 'xor', 'xnor'],
    ['downto', 'to', 'others', 'when', 'else', 'range', 'elsif', 'after', 'transport', 'reject', 'inertial', 'all'],
    ['of', 'new', 'force', 'release'],
    ['severity']
  ].flat().map(keyword => new RegExp('^' + keyword + '\\b', 'i'));
  tokenTypes = [
    { regex: /^--.*/, tokenType: 'COMMENT' },
    { regex: /^\s+/i, tokenType: 'WHITESPACE' },
    { regex: /^[0-9]+#[0-9a-z][0-9_a-z]*(?:\.[0-9a-z][0-9_a-z]+)?#(?:e[+-]?[0-9_]+)?/i, tokenType: 'DECIMAL_LITERAL' },
    { regex: /^[0-9_]+(?:\.[0-9_]+)?(?:e[+-]?[0-9_]+)?/i, tokenType: 'DECIMAL_LITERAL' },
    { regex: /^[a-z][a-z0-9_]*/i, tokenType: 'BASIC_IDENTIFIER' },
    { regex: /^\\.*?[^\\]\\(?!\\)/i, tokenType: 'EXTENDED_IDENTIFIER' },
    // BASED LITERAL
    { regex: /^'.'/, tokenType: 'CHARACTER_LITERAL' },
    { regex: /^".*?[^"]"(?!")/i, tokenType: 'STRING_LITERAL' },
    { regex: /^[0-9]*(?:B|O|X|UB|UO|UX|SB|SO|SX|D)"[^"]+"/i, tokenType: 'BIT_STRING_LITERAL' },
    {
      regex: /^=>|\*\*|:=|\/=>=|<=|<>|\?\?|\?=|\?\/=|\?<|\?<=|\?>|\?>=|<<|>>|&|'|\(|\)|\*|\+|,|-|.|\/|:|;|<|=|>|`|\||\[|\]|\?|@/,
      tokenType: 'DELIMITER'
    },
    // { regex: /^;/, tokenType: 'SEMICOLON' },
    // { regex: /^(["])(([^"\\\n]|\\.|\\\n)*)["]/i, tokenType: 'STRING_LITERAL' },
    // { regex: /^[*\/&\-?=<>+]+/i, tokenType: 'OPERATION' },
    // { regex: /^[()]/i, tokenType: 'BRACE' },
    // { regex: /^,/i, tokenType: 'COMMA' },
    // { regex: /^\btrue|false\b/i, tokenType: 'BOOLEAN_LITERAL' },
    // { regex: /^\bnull\b/i, tokenType: 'NULL_LITERAL' },
    // { regex: /^"[0-9ZWLH-UX]+"/i, tokenType: 'LOGIC_LITERAL' },
    // { regex: /^\d*[su]?[box]"[0-9A-F_ZWLH-UX]+"/i, tokenType: 'LOGIC_LITERAL' },
    // { regex: /^'[0-9ZWLH-UX]+'/i, tokenType: 'LOGIC_LITERAL' },
    // { regex: /^\w+'\w+(?=\s*\()/i, tokenType: 'ATTRIBUTE_FUNCTION' },
    // { regex: /^()([a-z]\w*)\s*(?=\=>)/i, tokenType: 'RECORD_ELEMENT' },
    // { regex: /^[a-z]\w*(?!\s*[(]|\w)/i, tokenType: 'VARIABLE' },
    // { regex: /^(\.)([a-z]\w*)(?!\s*[(]|\w)/i, tokenType: 'RECORD_ELEMENT' },
    // { regex: /^\w+(?=\s*\()/i, tokenType: 'FUNCTION' },
    // { regex: /^(\.)(\w+)(?=\s*\()/i, tokenType: 'FUNCTION_RECORD_ELEMENT' },
  ];
  constructor(
    public text: string,
    public file: OFile
  ) { }
  lex() {
    const tokens: OLexerToken[] = [];
    let foundToken;
    let offset = 0;
    let lastOffset = -1;
    let text = this.text.toLowerCase();
    let iterationCount = 0;
    loop: do {
      // if (iterationCount++ > 10000) {
      //   throw new ParserError('Lexer infinite loop2!', new OIRange(this.file, offset, offset));
      // }
      if (lastOffset === offset) {
        throw new ParserError('Lexer infinite loop!', new OIRange(this.file, offset, offset));
      }
      lastOffset = offset;
      foundToken = false;
      for (const operator of this.keywords) {
        const match = text.match(operator);
        if (match) {
          const token = new OLexerToken(match[0],
            new OIRange(this.file, offset, offset + match[0].length), 'KEYWORD');

          tokens.push(token);
          text = text.substring(match[0].length);
          offset += match[0].length;
          foundToken = true;

          continue loop;
        }
      }
      for (const tokenType of this.tokenTypes) {
        let match = text.match(tokenType.regex);
        if (match) {
          const token = new OLexerToken(match[2] ? match[2] : match[0],
            new OIRange(this.file, offset, offset + match[0].length), tokenType.tokenType);

          tokens.push(token);
          text = text.substring(match[0].length);
          offset += match[0].length;
          foundToken = true;
          continue loop;
        }
      }
      if (!foundToken) {
        throw new ParserError('Lexer stuck!', new OIRange(this.file, offset, offset));
      }
    } while (text.length > 0 && foundToken);
    // console.log(tokens);
    return tokens;
  }
}