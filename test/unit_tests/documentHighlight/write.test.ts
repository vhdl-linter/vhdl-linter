import { expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { URI } from 'vscode-uri';
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { documentHighlightHandler } from '../../../lib/languageFeatures/documentHightlightHandler';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';


test('testing document highlight snapshop write', async () => {

  const filename = join(__dirname, 'test_highlight.vhd');
  const linter = new VhdlLinter(filename, readFileSync(filename, { encoding: 'utf8' }),
    await ProjectParser.create([], '', defaultSettingsGetter), defaultSettingsGetter);
  await Elaborate.elaborate(linter);
  const highlights = await documentHighlightHandler(linter, {
    textDocument: {
      uri: URI.file(filename).toString()
    },
    position: {
      line: 13,
      character: 2
    }
  });
  expect(highlights).toMatchSnapshot();

});
test('testing document highlight on keyword', async () => {

  const filename = join(__dirname, 'test_highlight.vhd');
  const linter = new VhdlLinter(filename, readFileSync(filename, { encoding: 'utf8' }),
    await ProjectParser.create([], '', defaultSettingsGetter), defaultSettingsGetter);
  await Elaborate.elaborate(linter);
  const highlights = await documentHighlightHandler(linter, {
    textDocument: {
      uri: URI.file(filename).toString()
    },
    position: {
      line: 10,
      character: 13
    }
  });
  expect(highlights).toHaveLength(0);

});