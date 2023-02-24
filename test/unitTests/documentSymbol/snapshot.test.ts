import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { DocumentSymbols } from '../../../lib/languageFeatures/documentSymbol';
import { workspaceSymbol } from '../../../lib/languageFeatures/workspaceSymbol';
import { ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../readFileSyncNorm";

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});

test.each(
  readdirSync(__dirname).filter(v => v.endsWith('.vhd'))
)('Testing document symbols of %s', (fileName) => {
  const path = join(__dirname, fileName);
  const uri = pathToFileURL(path);
  const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  const symbols = DocumentSymbols.get(linter);
  expect(symbols).toMatchSnapshot();
});
test('Testing workspace symbol', () => {
  const symbols = workspaceSymbol({query: ''}, projectParser)?.map(symbol => ({
    ...symbol,
    uri: symbol.location.uri.replace(pathToFileURL(__dirname).toString(), 'file:///c/dummy/')
  }));
  expect(symbols).toMatchSnapshot();
});