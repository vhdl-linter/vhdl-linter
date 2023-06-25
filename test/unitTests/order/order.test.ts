import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { ProjectParser } from '../../../lib/projectParser';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { readFileSyncNorm } from '../../readFileSyncNorm';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { defaultSettingsGetter } from '../../../lib/settings';
let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});
test('Test order rule', async () => {
  const path = join(__dirname, 'test.vhd');
  const uri = pathToFileURL(path);
  const linter = new VhdlLinter(uri, readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter());
  await linter.checkAll();

  expect(linter.messages).toHaveLength(2);
  for (const message of linter.messages) {

    expect(message.message).toMatch(/order/i);
  }
});