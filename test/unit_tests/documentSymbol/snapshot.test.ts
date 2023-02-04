import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { DocumentSymbols } from '../../../lib/languageFeatures/documentSymbol';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
import { readFileSyncNorm } from '../rename/rename.test';

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([__dirname], '', defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});

test.each(
  readdirSync(__dirname).filter(v => v.endsWith('.vhd'))
)('Testing document symbols of %s', async (fileName) => {
  const path = join(__dirname, fileName);
  const linter = new VhdlLinter(path, readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  const symbols = DocumentSymbols.get(linter);
  expect(symbols).toMatchSnapshot();
});