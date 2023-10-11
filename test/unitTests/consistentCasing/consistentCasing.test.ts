import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { ProjectParser } from '../../../lib/projectParser';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { readFileSyncNorm } from '../../../lib/cli/readFileSyncNorm';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { sanitizeActions } from '../../helper';
import { overwriteSettings } from '../../../lib/settingsUtil';
import { CancellationTokenSource } from 'vscode-languageserver';
let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
});
afterAll(async () => {
  await projectParser.stop();
});
test('Test consistent casing rule', async () => {
  const path = join(__dirname, 'test.vhd');
  const uri = pathToFileURL(path);
  const settings = overwriteSettings(await projectParser.getDocumentSettings(uri), {
    rules: {
      "consistent-casing": true
    }
  });
  const linter = new VhdlLinter(uri, readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, settings);
  await linter.checkAll();

  expect(linter.messages).toHaveLength(2);
  for (const message of linter.messages) {

    expect(message.message).toMatch(/consistent-casing/i);
    if (typeof message.code === 'string') {
      for (const action of message.code?.split(';') ?? []) {
        const actions = await Promise.all(await linter.diagnosticCodeActionRegistry[parseInt(action)]?.(`file:///test.vhd`, new CancellationTokenSource().token) ?? []);
        sanitizeActions(actions);
        expect(actions).toMatchSnapshot();
      }
    }
  }
});