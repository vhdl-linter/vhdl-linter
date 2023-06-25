import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { ProjectParser } from '../../../lib/projectParser';
import { pathToFileURL } from 'url';
import { defaultSettingsWithOverwrite } from '../../../lib/settings';
import { join } from 'path';
import { readFileSyncNorm } from '../../readFileSyncNorm';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { sanitizeActions } from '../../helper';
let projectParser: ProjectParser;
const settingsGetter = defaultSettingsWithOverwrite({
  rules: {
    "consistent-casing": true
  }
});
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], settingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});
test('Test consistent casing rule', async () => {
  const path = join(__dirname, 'test.vhd');
  const uri = pathToFileURL(path);
  const linter = new VhdlLinter(uri, readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, settingsGetter());
  await linter.checkAll();

  expect(linter.messages).toHaveLength(2);
  for (const message of linter.messages) {

    expect(message.message).toMatch(/consistent-casing/i);
    if (typeof message.code === 'string') {
      for (const action of message.code?.split(';') ?? []) {
        const actions = await Promise.all(await linter.diagnosticCodeActionRegistry[parseInt(action)]?.(`file:///test.vhd`) ?? []);
        sanitizeActions(actions);
        expect(actions).toMatchSnapshot();
      }
    }
  }
});