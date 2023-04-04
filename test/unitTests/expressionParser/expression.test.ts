import { expect, test } from '@jest/globals';
import { pathToFileURL } from 'url';
import { Lexer, OLexerToken } from '../../../lib/lexer';
import { ExpressionParser } from '../../../lib/parser/expressionParser';
import { ObjectBase, OFile, OIRange, OName } from '../../../lib/parser/objects';
import { ParserPosition, ParserState } from '../../../lib/parser/parserBase';

test.each([
  ['rec1(element0(1 downto 0), element1(1 downto 0), element_rec(element(1 downto 0)))', 1, 11],
  [`a`, 1, 1],
  [`5 + 7`, 2, 2],
  [`5 - a`, 2, 2],
  [`(and a) & a`, 2, 3],
  [`a nor a`, 2, 2],
  [`a and a and a`, 3, 3],
  [`a_i ** a_i`, 2, 2],
  [`a_i ** (a_i / 2)`, 2, 4],
  [`a_i * abs a_i`, 2, 2],
  [`- a_i`, 1, 1],
  [`- a_i - a_i`, 2, 2],
  [`a_i /= a_i`, 2, 2],
  [`?? a(0)`, 1, 2],
  [`('0', '1')`, 1, 3],
  [`(0 => '0', others => '1')`, 1, 5],
  [`(0 => '0', 1 => '1')`, 1, 5],
  [`("10")`, 1, 2],
  [`+ ((((((a_i + 2))))))`, 1, 8],
  [`a sll 2 + 3 * 32`, 4, 4],
  [`a(to_integer(a * 2) - 3 downto 0 * 3)`, 1, 7],
  [`to_unsigned(a_i, 2)`, 1, 3],
  [`unsigned(std_ulogic_vector(a))`, 1, 3],
  [`xnor a`, 1, 1],
  [`unsigned'(1 => '0')`, 1, 3]])('testing expression %s expecting %d references %s flat references',
  (expression, numberOfReferences,  numberOfFlatReferences) => {
    const lexerTokens: OLexerToken[] = [];
    const file = new OFile('', pathToFileURL('/tmp/test'), '', lexerTokens);
    const parent = new ObjectBase(file, new OIRange(file, 0, 0));
    lexerTokens.push(...(new Lexer(expression, file).lex()));
    const expressionParser = new ExpressionParser(new ParserState(new ParserPosition, pathToFileURL('/tmp/test')), parent, lexerTokens);
    const references = expressionParser.parse();
    expect(references.length).toBe(numberOfReferences);
    function flattenReferences(reference: OName): OName[] {
      return [
        reference,
        ...reference.children.flatMap(flattenReferences)
      ];
    }
    const flatReferences = references.flatMap(flattenReferences);
    expect(flatReferences.length).toBe(numberOfFlatReferences);
  });