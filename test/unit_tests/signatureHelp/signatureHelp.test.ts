import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SignatureHelp } from 'vscode';
import { Position } from 'vscode-languageserver';
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { signatureHelp } from '../../../lib/languageFeatures/signatureHelp';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([__dirname], '', defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});
async function prepare(fileName: string) {
  const path = join(__dirname, fileName);
  const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  await Elaborate.elaborate(linter);
  return linter;
}
test('Signature help snapshot port', async () => {
  const linter = await prepare('entity.vhd');
  const help = await signatureHelp(linter, Position.create(7, 6));

  expect(help).toMatchInlineSnapshot(`
{
  "signatures": [
    {
      "activeParameter": 0,
      "label": "port1, port2, port3",
      "parameters": [
        {
          "documentation": {
            "kind": "markdown",
            "value": "\`\`\`vhdl
port1 : in integer
\`\`\`",
          },
          "label": "port1",
        },
        {
          "documentation": {
            "kind": "markdown",
            "value": "\`\`\`vhdl
port2 : in integer
\`\`\`",
          },
          "label": "port2",
        },
        {
          "documentation": {
            "kind": "markdown",
            "value": "\`\`\`vhdl
port3 : in integer
\`\`\`",
          },
          "label": "port3",
        },
      ],
    },
  ],
}
`);

});
test('Signature help snapshot generic', async () => {
  const linter = await prepare('entity.vhd');
  const help = await signatureHelp(linter, Position.create(18, 14));

  expect(help).toMatchInlineSnapshot(`
{
  "signatures": [
    {
      "activeParameter": 0,
      "label": "GENERIC_A, GENERIC_B",
      "parameters": [
        {
          "documentation": {
            "kind": "markdown",
            "value": "\`\`\`vhdl
GENERIC_A : integer
\`\`\`",
          },
          "label": "GENERIC_A",
        },
        {
          "documentation": {
            "kind": "markdown",
            "value": "\`\`\`vhdl
GENERIC_B : integer
\`\`\`",
          },
          "label": "GENERIC_B",
        },
      ],
    },
  ],
}
`);

});
test('Signature help on non existent formal', async () => {
  const linter = await prepare('entity.vhd');
  const help = await signatureHelp(linter, Position.create(15, 8));
  expect(help?.signatures).toHaveLength(1);

  expect((help as SignatureHelp).signatures[0].activeParameter).toBe(3);
});
test('Signature help snapshot active parameter', async () => {
  const linter = await prepare('entity.vhd');
  expect(signatureHelp(linter, Position.create(8, 8))?.signatures[0].activeParameter).toBe(2);
  expect(signatureHelp(linter, Position.create(9, 11))?.signatures[0].activeParameter).toBe(1);
});
test('Signature help snapshot active parameter for partially filled', async () => {
  const linter = await prepare('component.vhd');
  expect(signatureHelp(linter, Position.create(23, 13))?.signatures[0].activeParameter).toBe(0);
  // Comma entered before and after
  expect(signatureHelp(linter, Position.create(26, 12))?.signatures[0].activeParameter).toBe(0);
  expect(signatureHelp(linter, Position.create(26, 13))?.signatures[0].activeParameter).toBe(1);
  // only part of formal
  expect(signatureHelp(linter, Position.create(30, 12))?.signatures[0].activeParameter).toBe(2);

});
test.each([
  [18, 'par1'],
  [19, 'par1'],
  [20, 'par2'],
  [21, 'par2'],
  [22, 'par2'],
])('Signature help procedure instantiation character %d expecting parameter %s', async (characterReal, parameter) => {
  const linter = await prepare('entity.vhd');
  const help = signatureHelp(linter, Position.create(21, characterReal - 1));
  expect(help?.signatures[0].parameters?.[help?.signatures[0].activeParameter ?? -1]?.label).toBe(parameter);
});
test('Signature help with component', async () => {
  const linter = await prepare('component.vhd');
  expect(signatureHelp(linter, Position.create(21, 42))?.signatures[0].label).toBe('port1, port2, port3');
});