import { OFile, OIRange, ParserError } from './parser/objects';

export enum TokenType {
  basicIdentifier = 'basicIdentifier',
  extendedIdentifier = 'extendedIdentifier',
  decimalLiteral = 'decimalLiteral',
  characterLiteral = 'characterLiteral',
  stringLiteral = 'stringLiteral',
  bitStringLiteral = 'bitStringLiteral',
  whitespace = 'whitespace',
  comment = 'comment',
  delimiter = 'delimiter',
  keyword = 'keyword',
  implicit = 'implicit'
}

export class OLexerToken {
  constructor(
    public text: string,
    public range: OIRange,
    public type: TokenType,
    public file: OFile
  ) {
  }
  isIdentifier() {
    return this.type === TokenType.basicIdentifier || this.type === TokenType.extendedIdentifier;
  }
  isDesignator() {
    return this.type === TokenType.basicIdentifier || this.type === TokenType.extendedIdentifier
      || this.type === TokenType.stringLiteral || this.type === TokenType.characterLiteral;
  }
  isLiteral() {
    return this.type === TokenType.decimalLiteral || this.type === TokenType.bitStringLiteral
      || this.type === TokenType.stringLiteral || this.type === TokenType.characterLiteral || this.getLText() === 'null';

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
export const reservedWords = [
  'abs', 'access', 'after', 'alias', 'all', 'and', 'architecture', 'array', 'assert', 'assume', 'assume_guarantee', 'attribute', 'begin', 'block', 'body', 'buffer',
  'bus', 'case', 'component', 'configuration', 'constant', 'context', 'cover', 'default', 'disconnect', 'downto', 'else', 'elsif', 'end', 'entity', 'exit', 'fairness',
  'file', 'for', 'force', 'function', 'generate', 'generic', 'group', 'guarded', 'if', 'impure', 'in', 'inertial', 'inout', 'is', 'label', 'library',
  'linkage', 'literal', 'loop', 'map', 'mod', 'nand', 'new', 'next', 'nor', 'not', 'null', 'of', 'on', 'open', 'or', 'others',
  'out', 'package', 'parameter', 'port', 'postponed', 'procedure', 'process', 'property', 'protected', 'pure', 'range', 'record', 'register', 'reject', 'release', 'rem',
  'report', 'restrict', 'restrict_guarantee', 'return', 'rol', 'ror', 'select', 'sequence', 'severity', 'signal', 'shared', 'sla', 'sll', 'sra', 'srl', 'strong',
  'subtype', 'then', 'to', 'transport', 'type', 'unaffected', 'units', 'until', 'use', 'variable', 'vmode', 'vprop', 'vunit', 'wait', 'when', 'while', 'with', 'xnor', 'xor',
];
export class Lexer {
  readonly reservedWordsRegex = new RegExp('^(' + reservedWords.join('|') + ')\\b', 'i');

  tokenTypes: { regex: RegExp, tokenType: TokenType }[] = [
    { regex: /^--.*/, tokenType: TokenType.comment },
    { regex: /^\s+/i, tokenType: TokenType.whitespace },
    { regex: /^[0-9]+#[0-9a-z][0-9_a-z]*(?:\.[0-9a-z][0-9_a-z]+)?#(?:e[+-]?[0-9_]+)?/i, tokenType: TokenType.decimalLiteral },
    { regex: /^-?[0-9_]+(?:\.[0-9_]+)?(?:e[+-]?[0-9_]+)?/i, tokenType: TokenType.decimalLiteral },
    { regex: /^[0-9]*(?:B|O|X|UB|UO|UX|SB|SO|SX|D)"[^"]+"/i, tokenType: TokenType.bitStringLiteral },
    { regex: /^[a-z][a-z0-9_]*/i, tokenType: TokenType.basicIdentifier },
    { regex: /^\\.*?[^\\]\\(?!\\)/i, tokenType: TokenType.extendedIdentifier },
    // BASED LITERAL
    { regex: /^'.'/, tokenType: TokenType.characterLiteral },
    { regex: /^"(?:[^"]|(?:""))*"(?!")/i, tokenType: TokenType.stringLiteral },
    {
      regex: /^=>|\*\*|:=|\/=>=|<=|<>|\?\?|\?=|\?\/=|\/=|\?<|\?<=|\?>|\?>=|<<|>>|&|'|\(|\)|\*|\+|,|-|.|\/|:|;|<|=|>|`|\||\[|\]|\?|@/,
      tokenType: TokenType.delimiter
    },

  ];
  tokens: OLexerToken[];
  // A tokens array as a target can be supplied.
  constructor(
    public text: string,
    public file: OFile,
    tokens: [] = [] // The tokens array has to be empty!
  ) {
    this.tokens = tokens;
  }
  lex(file: OFile) {
    let foundToken = true;
    let offset = 0;
    let lastOffset = -1;
    let text = this.text;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    loop: while (text.length > 0 && foundToken) {
      // if (iterationCount++ > 10000) {
      //   throw new ParserError('Lexer infinite loop2!', new OIRange(this.file, offset, offset));
      // }
      if (lastOffset === offset) {
        throw new ParserError('Lexer infinite loop!', new OIRange(this.file, offset, offset));
      }
      lastOffset = offset;
      foundToken = false;
      const match = text.match(this.reservedWordsRegex) as [string] | null;
      if (match) {
        const token = new OLexerToken(match[0],
          new OIRange(this.file, offset, offset + match[0].length), TokenType.keyword, file);

        this.tokens.push(token);
        text = text.substring(match[0].length);
        offset += match[0].length;
        foundToken = true;

        continue loop;
      }
      for (const tokenType of this.tokenTypes) {
        const match = text.match(tokenType.regex);
        if (match) {
          const firstMatch = match[0];
          const token = new OLexerToken(match[2] ? match[2] : firstMatch,
            new OIRange(this.file, offset, offset + match[0].length), tokenType.tokenType, file);

          this.tokens.push(token);
          text = text.substring(firstMatch.length);
          offset += firstMatch.length;
          foundToken = true;
          continue loop;
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!foundToken) {
        throw new ParserError('Lexer stuck!', new OIRange(this.file, offset, offset));
      }
    }
    // console.log(tokens);
    return this.tokens;
  }
}