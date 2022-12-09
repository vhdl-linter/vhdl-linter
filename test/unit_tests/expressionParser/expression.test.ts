import { expect, test } from '@jest/globals';
import { Lexer } from '../../../lib/lexer';
import { ExpressionParser } from '../../../lib/parser/expression-parser';
import { ObjectBase, OFile, OIRange } from '../../../lib/parser/objects';
import { ParserPosition, ParserState } from '../../../lib/parser/parser-base';

test.each([[`a`, 1],
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
[`('0', '1')`, 0],
[`(0 => '0', others => '1')`, 0],
[`(0 => '0', 1 => '1')`, 0],
[`("10")`, 0],
[`+ ((((((a_i + 2))))))`, 1],
[`a sll 2 + 3 * 32`, 1],
[`a(to_integer(a * 2) - 3 downto 0 * 3)`, 3],
[`to_unsigned(a_i, 2)`, 2],
[`unsigned(std_ulogic_vector(a))`, 3],
[`xnor a`, 1],
[`unsigned'(1 => '0')`, 1]])('testing expression %s expecting %d references',
  (expression, numberOfReferences) => {
    const file = new OFile('', '', '');
    const parent = new ObjectBase(file, new OIRange(file, 0, 0));
    const lexerTokens = new Lexer(expression, file).lex();
    const expressionParser = new ExpressionParser(parent, lexerTokens);
    const references = expressionParser.parse();
    expect(references.length).toBe(numberOfReferences);

  });