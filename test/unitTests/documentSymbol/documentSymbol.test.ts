import { expect, test } from '@jest/globals';
import { readdir } from 'fs/promises';
import { minimatch } from 'minimatch';
import { basename, join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { DocumentSymbol } from 'vscode-languageserver';
import { DocumentSymbols } from "../../../lib/languageFeatures/documentSymbol";
import { OI } from "../../../lib/parser/objects";
import { ProjectParser, vhdlGlob } from '../../../lib/projectParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { makeRangePrintable } from '../../helper';
import { readFileSyncNorm } from '../../../lib/cli/readFileSyncNorm';
import { defaultSettings } from '../../../lib/settingsGenerated';
import { URL } from 'url';

async function getFiles(dir: string): Promise<string[]> {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return files.flat();
}
test('test for selection must be contained in full range', async () => {
  const projectParser = await ProjectParser.create([]);
  const files = [
    ...await getFiles(join(__dirname, '..', '..', 'test_files', 'test_no_error')),
    ...await getFiles(join(__dirname, '..', '..', '..', 'ieee2008'))];
  for (const file of files) {
    if (minimatch(basename(file), vhdlGlob) === false) {
      continue;
    }
    const url = pathToFileURL(file);
    const linter = new VhdlLinter(url, readFileSyncNorm(url, { encoding: 'utf8' }), projectParser, defaultSettings);
    const symbols = DocumentSymbols.get(linter);
    for (const symbol of symbols) {
      checkSymbol(symbol, url);
    }

  }
  await projectParser.stop();

});
function checkSymbol(symbol: DocumentSymbol, url: URL) {
  if ((symbol.range.start as OI).i > (symbol.selectionRange.start as OI).i) {
    console.log(url, { name: symbol.name, detail: symbol.detail }, makeRangePrintable(symbol.range), makeRangePrintable(symbol.selectionRange));
    expect(true).toBe(false);
  }
  if ((symbol.range.end as OI).i < (symbol.selectionRange.end as OI).i) {
    console.log(url, { name: symbol.name, detail: symbol.detail });
    expect(true).toBe(false);

  }

  for (const child of symbol.children ?? []) {
    checkSymbol(child, url);
  }
}