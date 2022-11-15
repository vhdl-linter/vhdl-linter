import { expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getDocumentSymbol } from '../../../lib/languageFeatures/documentSymbol';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
test('testing document symbol snapshot', async () => {
  const filename = join(__dirname, 'test_generate.vhd');
  const linter = new VhdlLinter(filename, readFileSync(filename, { encoding: 'utf8' }),
    await ProjectParser.create([], '', defaultSettingsGetter), defaultSettingsGetter)
  const symbols = getDocumentSymbol(linter);
  expect(symbols).toMatchSnapshot();
});