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
test.each([
  'entity.vhd',
])('Testing signature help of %s', async (fileName) => {
  const path = join(__dirname, fileName);
  const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  await Elaborate.elaborate(linter);

  const help = await signatureHelp(linter, Position.create(7, 0));
  expect(help).toMatchInlineSnapshot(`
{
  "signatures": [
    {
      "activeParameter": 1,
      "label": "port1 : in integer;
    port2 : in integer;
    port3 : in integer",
      "parameters": [
        {
          "label": "port1 : in integer",
        },
        {
          "label": "port2 : in integer",
        },
        {
          "label": "port3 : in integer",
        },
      ],
    },
  ],
}
`);

});