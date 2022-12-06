import { OIRange, OFile, ParserError } from './parser/objects';

export enum TokenType {
  basicIdentifier,
  extendedIdentifier,
  decimalLiteral,
  characterLiteral,
  stringLiteral,
  bitStringLiteral,
  whitespace,
  comment,
  delimiter,
  keyword,
}

export class OLexerToken {
  constructor(
    public text: string,
    public range: OIRange,
    public type: TokenType
  ) {
  }
  isIdentifier() {
    return this.type === TokenType.basicIdentifier || this.type === TokenType.extendedIdentifier;
  }
  isDesignator() {
    return this.type === TokenType.basicIdentifier || this.type === TokenType.extendedIdentifier
    || this.type === TokenType.stringLiteral || this.type === TokenType.characterLiteral;

  }
  isWhitespace() {
    return this.type === TokenType.whitespace || this.type === TokenType.comment;
  }
  getLText() {
    return this.text.toLowerCase();
  }
  toString() {
    return this.text;
  }
}
export const GRAPHIC_CHARACTER = String.raw`[a-z0-9 "#&'()*+,-./:;<£¤¥¦§ ̈©ª«¬- ® ̄°±=>_|!$%?@\[\\\]\^\`{}~¡¢²³ ́μ¶· ̧¹º»¼½¾¿×÷]`;
export class Lexer {
  // TODO: Enter correct list of keywords from IEEE 2008 page 236
  readonly keywords = [
    'abs', 'not', 'mod', 'sll', 'srl', 'sla', 'sra', 'rol', 'ror',
    'and', 'or', 'nand', 'nor', 'xor', 'xnor', 'downto', 'to', 'others', 'rem',
    'when', 'else', 'range', 'elsif', 'after', 'transport', 'reject',
    'inertial', 'all', 'of', 'new', 'force', 'release', 'severity', 'open',
    'null', 'guarded', 'postponed', 'exit', 'units'
  ].map(keyword => new RegExp('^' + keyword + '\\b', 'i'));

  tokenTypes: { regex: RegExp, tokenType: TokenType }[] = [
    { regex: /^--.*/, tokenType: TokenType.comment },
    { regex: /^\s+/i, tokenType: TokenType.whitespace },
    { regex: /^[0-9]+#[0-9a-z][0-9_a-z]*(?:\.[0-9a-z][0-9_a-z]+)?#(?:e[+-]?[0-9_]+)?/i, tokenType: TokenType.decimalLiteral },
    { regex: /^[0-9_]+(?:\.[0-9_]+)?(?:e[+-]?[0-9_]+)?/i, tokenType: TokenType.decimalLiteral },
    { regex: /^[0-9]*(?:B|O|X|UB|UO|UX|SB|SO|SX|D)"[^"]+"/i, tokenType: TokenType.bitStringLiteral },
    { regex: /^[a-z][a-z0-9_]*/i, tokenType: TokenType.basicIdentifier },
    { regex: /^\\.*?[^\\]\\(?!\\)/i, tokenType: TokenType.extendedIdentifier },
    // BASED LITERAL
    { regex: /^'.'/, tokenType: TokenType.characterLiteral },
    { regex: /^"(?:[^"]|(?:""))*"(?!")/i, tokenType: TokenType.stringLiteral },
    {
      regex: /^=>|\*\*|:=|\/=>=|<=|<>|\?\?|\?=|\?\/=|\?<|\?<=|\?>|\?>=|<<|>>|&|'|\(|\)|\*|\+|,|-|.|\/|:|;|<|=|>|`|\||\[|\]|\?|@/,
      tokenType: TokenType.delimiter
    },

  ];
  constructor(
    public text: string,
    public file: OFile
  ) { }
  lex() {
    const tokens: OLexerToken[] = [];
    let foundToken = true;
    let offset = 0;
    let lastOffset = -1;
    let text = this.text;
    loop: while (text.length > 0 && foundToken) {
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
            new OIRange(this.file, offset, offset + match[0].length), TokenType.keyword);

          tokens.push(token);
          text = text.substring(match[0].length);
          offset += match[0].length;
          foundToken = true;

          continue loop;
        }
      }
      for (const tokenType of this.tokenTypes) {
        const match = text.match(tokenType.regex);
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
    }
    // console.log(tokens);
    return tokens;
  }
}