import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { DocumentSymbols } from '../../../lib/languageFeatures/documentSymbol';
import { workspaceSymbol } from '../../../lib/languageFeatures/workspaceSymbol';
import { ProjectParser } from '../../../lib/projectParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../../lib/cli/readFileSyncNorm";


let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
});
afterAll(async () => {
  await projectParser.stop();
});

test.each(
  readdirSync(__dirname).filter(v => v.endsWith('.vhd'))
)('Testing document symbols of %s', async (fileName) => {
  const path = join(__dirname, fileName);
  const uri = pathToFileURL(path);
  const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser, await projectParser.getDocumentSettings(uri));
  const symbols = DocumentSymbols.get(linter);
  expect(symbols).toMatchSnapshot();
});
test('Testing workspace symbol', () => {
  const symbols = workspaceSymbol({ query: '' }, projectParser, [])?.map(symbol => ({
    ...symbol,
    location: {
      ...symbol.location,
      uri: symbol.location.uri.replace(pathToFileURL(__dirname).toString(), 'file:///c/dummy/')
    }
  }));
  symbols?.sort((a, b) => {
    if (a.location.uri !== b.location.uri) {
      return a.location.uri > b.location.uri ? 1 : -1;
    }
    const lineDifference = b.location.range.start.line - a.location.range.start.line;
    if (lineDifference !== 0) {
      return lineDifference;
    }
    return b.location.range.start.character - a.location.range.start.character;
  });
  expect(symbols).toMatchSnapshot();
});