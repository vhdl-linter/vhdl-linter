import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsGetter, defaultSettingsWithOverwrite } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../readFileSyncNorm";

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});

test('Testing conditional analysis true', async () => {
  const path = join(__dirname, 'test_conditional.vhd');
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, defaultSettingsWithOverwrite({
    analysis: {
      conditionalAnalysis: {
        DEVICE: 'TEST1'
      }
    }
  })());
  await linter.checkAll();

  expect(linter.messages).toHaveLength(0);
});
test('Testing conditional analysis true not set', async () => {
  const path = join(__dirname, 'test_conditional.vhd');
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter());
  await linter.checkAll();
  expect(linter.messages).toHaveLength(1);
});
test('Testing conditional analysis conditions', async () => {
  const path = join(__dirname, 'test_conditional2.vhd');
  const text = readFileSyncNorm(path, { encoding: 'utf8' });
  const linter = new VhdlLinter(pathToFileURL(path), text,
    projectParser, defaultSettingsWithOverwrite({
      analysis: {
        conditionalAnalysis: {
          VALUE5: "5",
          VALUE6: "6"
        }
      }
    })());

  const matches = [...text.matchAll(/TRUE/ig)];
  await linter.checkAll();
  expect(linter.messages).toHaveLength(matches.length);
  const wrongMessages = linter.messages.filter(message => message.message.includes('TRUE') === false || message.message.includes('FALSE'));
  expect(wrongMessages).toHaveLength(0);
});
test.each([
  'test_tool_unknown.vhd',
  'test_tool_unknown2.vhd',
])('Testing unknown tool directive in file %s', async filename => {
  const path = join(__dirname, filename);
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter());
  await linter.checkAll();
  expect(linter.messages).toHaveLength(1);
  expect(linter.messages[0]?.message).toBe(`Unknown tool directive 'UNKNOWN' (parser)`);
});