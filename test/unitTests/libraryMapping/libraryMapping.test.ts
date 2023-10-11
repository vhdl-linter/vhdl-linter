import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { FileCacheLibraryList, ProjectParser } from '../../../lib/projectParser';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { readFileSyncNorm } from '../../../lib/cli/readFileSyncNorm';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { sanitizeActions } from '../../helper';
import { readdirSync } from 'fs';
import { CancellationTokenSource } from 'vscode-languageserver';

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
});
afterAll(async () => {
  await projectParser.stop();
});
const files = readdirSync(__dirname).filter(file => file.endsWith('.vhd'));
test.each(files)('Test library mapping with vunit like csv files (%s)', async (file: string) => {
  const path = join(__dirname, file);
  const uri = pathToFileURL(path);
  const linter = new VhdlLinter(uri, readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, await projectParser.getDocumentSettings(pathToFileURL(path)));
  await linter.checkAll();

  for (const message of linter.messages) {
    expect(message).toMatchSnapshot();
    if (typeof message.code === 'string') {
      for (const action of message.code?.split(';') ?? []) {

        const actions = await Promise.all(await linter.diagnosticCodeActionRegistry[parseInt(action)]?.(`file:///test.vhd`, new CancellationTokenSource().token) ?? []);
        sanitizeActions(actions);
        expect(actions).toMatchSnapshot();
      }
    }
  }
});
test('Messages of csv files', () => {
  for (const libraryListCache of projectParser.cachedFiles) {
    if (libraryListCache instanceof FileCacheLibraryList) {
      expect(libraryListCache.messages).toMatchSnapshot();
    }
  }
});