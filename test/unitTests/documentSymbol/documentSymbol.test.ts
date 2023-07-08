import { expect, test } from '@jest/globals';
import { readdir } from 'fs/promises';
import { minimatch } from 'minimatch';
import { basename, join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { DocumentSymbols } from "../../../lib/languageFeatures/documentSymbol";
import { OI } from "../../../lib/parser/objects";
import { ProjectParser, vhdlGlob } from '../../../lib/projectParser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from '../../readFileSyncNorm';
async function* getFiles(dir: string): AsyncGenerator<string, void, unknown> {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      yield res;
    }
  }
}
test('test for selection must be contained in full range', async () => {
  let i = 0;
  const projectParser = await ProjectParser.create([], defaultSettingsGetter);
  for await (const file of getFiles(join(__dirname, '..', '..', 'test_files', 'test_no_error'))) {
    if (minimatch(basename(file), vhdlGlob) === false) {
      continue;
    }
    const url = pathToFileURL(file);
    const linter = new VhdlLinter(url, readFileSyncNorm(url, { encoding: 'utf8' }), projectParser, defaultSettingsGetter());
    const symbols = DocumentSymbols.get(linter);
    for (const child of symbols) {
      expect((child.range.start as OI).i > (child.selectionRange.start as OI).i).toBe(false);
      expect((child.range.end as OI).i < (child.selectionRange.end as OI).i).toBe(false);
    }
    console.log('i', i++)

  }
  await projectParser.stop();

});