
import { expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
import { readFileSyncNorm } from "../../readFileSyncNorm";

test('testing attribute parser for declaration and specification %s', async () => {
  const file = 'attribute_test.vhd';
  const path = join(__dirname, file);
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);

  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter);
  await linter.checkAll();

  expect(linter.messages).toHaveLength(0);
  await projectParser.stop();
});