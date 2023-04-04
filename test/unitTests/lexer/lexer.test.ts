import { expect, test } from '@jest/globals';
import { Lexer, OLexerToken, TokenType } from "../../../lib/lexer";
import { OFile } from '../../../lib/parser/objects';

test.each([
  ['1 to i-1', 7, 5]
])('testing lexer', (text: string, tokens: number, nonWhiteSpaceTokens: number) => {
  const lexerTokens: OLexerToken[] = [];
  const file = new OFile(text, new URL('file:///dummy.vhd'), text, lexerTokens);
  const lexer = new Lexer(text, file, lexerTokens as []);
  lexer.lex();
  const lexerTokensSanitized = lexerTokens.map(token => ({text: token.text, type: token.type }));
  expect(lexerTokensSanitized).toHaveLength(tokens);
  expect(lexerTokensSanitized.filter(token => token.type !== TokenType.whitespace && token.type !== TokenType.comment)).toHaveLength(nonWhiteSpaceTokens);
});