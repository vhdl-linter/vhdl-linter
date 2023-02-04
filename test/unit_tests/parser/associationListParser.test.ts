import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Elaborate } from '../../../lib/elaborate/elaborate';
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
test('Not optional seperators in association list', async () => {
  const path = join(__dirname, 'associationListParser.vhd');
  const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  const messages = await linter.checkAll();
  expect(messages).toEqual(expect.arrayContaining([
    expect.objectContaining({
      message: "Unexpected ';' at end of interface list (parser)",
      range: expect.objectContaining({
        start: expect.objectContaining({
          line: 13,
          character: 22
        }),
        end: expect.objectContaining({
          line: 13,
          character: 23
        })
      }),
    }),
    expect.objectContaining({
      message: "Unexpected ',' at end of association list (parser)",
      range: expect.objectContaining({
        start: expect.objectContaining({
          line: 6,
          character: 7
        }),
        end: expect.objectContaining({
          line: 6,
          character: 8
        })
      }),
    })
  ]));
});