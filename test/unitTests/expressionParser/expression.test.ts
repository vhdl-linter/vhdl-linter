import { expect, test } from '@jest/globals';
import { pathToFileURL } from 'url';
import { Lexer, OLexerToken } from '../../../lib/lexer';
import { ExpressionParser } from '../../../lib/parser/expressionParser';
import { ObjectBase, OFile, OIRange } from '../../../lib/parser/objects';
import { ParserPosition, ParserState } from '../../../lib/parser/parserBase';

test.each([
  ['rec1(element0(1 downto 0), element1(1 downto 0), element_rec(element(1 downto 0)))', 1],
  [`a`, 1],
  [`5 + 7`, 0],
  [`5 - a`, 1],
  [`(and a) & a`, 2],
  [`a nor a`, 2],
  [`a and a and a`, 3],
  [`a_i ** a_i`, 2],
  [`a_i ** (a_i / 2)`, 2],
  [`a_i * abs a_i`, 2],
  [`- a_i`, 1],
  [`- a_i - a_i`, 2],
  [`a_i /= a_i`, 2],
  [`?? a(0)`, 1],
  [`('0', '1')`, 2],
  [`(0 => '0', others => '1')`, 3],
  [`(0 => '0', 1 => '1')`, 2],
  [`("10")`, 1],
  [`+ ((((((a_i + 2))))))`, 1],
  [`a sll 2 + 3 * 32`, 1],
  [`a(to_integer(a * 2) - 3 downto 0 * 3)`, 1],
  [`to_unsigned(a_i, 2)`, 1],
  [`unsigned(std_ulogic_vector(a))`, 1],
  [`xnor a`, 1],
  [`unsigned'(1 => '0')`, 1]])('testing expression %s expecting %d references',
  (expression, numberOfReferences) => {
    const lexerTokens: OLexerToken[] = [];
    const file = new OFile('', pathToFileURL('/tmp/test'), '', lexerTokens);
    const parent = new ObjectBase(file, new OIRange(file, 0, 0));
    lexerTokens.push(...(new Lexer(expression, file).lex(file)));
    const expressionParser = new ExpressionParser(new ParserState(new ParserPosition, pathToFileURL('/tmp/test')), parent, lexerTokens);
    const references = expressionParser.parse();
    expect(references.length).toBe(numberOfReferences);

  });