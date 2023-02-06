import { expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { documentHighlightHandler } from '../../../lib/languageFeatures/documentHighlightHandler';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
import { readFileSyncNorm } from "../../readFileSyncNorm";


test('testing document highlight snapshot write', async () => {

  const url = pathToFileURL(join(__dirname, 'test_highlight.vhd'));
  const linter = new VhdlLinter(url, readFileSyncNorm(url, { encoding: 'utf8' }),
    await ProjectParser.create([], '', defaultSettingsGetter), defaultSettingsGetter);
  await Elaborate.elaborate(linter);
  const highlights = await documentHighlightHandler(linter, {
    textDocument: {
      uri: url.toString()
    },
    position: {
      line: 13,
      character: 2
    }
  });
  expect(highlights).toMatchSnapshot();

});
test('testing document highlight on keyword', async () => {

  const url = pathToFileURL(join(__dirname, 'test_highlight.vhd'));

  const linter = new VhdlLinter(url, readFileSyncNorm(url, { encoding: 'utf8' }),
    await ProjectParser.create([], '', defaultSettingsGetter), defaultSettingsGetter);
  await Elaborate.elaborate(linter);
  const highlights = await documentHighlightHandler(linter, {
    textDocument: {
      uri: url.toString()
    },
    position: {
      line: 10,
      character: 13
    }
  });
  expect(highlights).toHaveLength(0);

});
