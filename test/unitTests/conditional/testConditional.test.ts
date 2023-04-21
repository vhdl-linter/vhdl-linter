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
