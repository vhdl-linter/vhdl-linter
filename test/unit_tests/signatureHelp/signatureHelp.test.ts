import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
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
test('Signature help snapshot', async ()=> {
  const linter = await prepare('entity.vhd');
  const help = await signatureHelp(linter, Position.create(6, 6));

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
test('Signature help snapshot active parameter', async () => {
  const linter = await prepare('entity.vhd');
  expect(signatureHelp(linter, Position.create(7, 8))?.signatures[0].activeParameter).toBe(2);
  expect(signatureHelp(linter, Position.create(8, 11))?.signatures[0].activeParameter).toBe(1);
});