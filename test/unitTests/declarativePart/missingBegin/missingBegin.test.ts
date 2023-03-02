import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../../lib/projectParser';
import { defaultSettingsGetter, defaultSettingsWithOverwrite } from '../../../../lib/settings';
import { VhdlLinter } from '../../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../../readFileSyncNorm";

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});

test.each(
  readdirSync(__dirname).filter(v => v.endsWith('.vhd'))
)('Testing behavior of missing statements in file %s', async (fileName) => {
  const path = join(__dirname, fileName);
  const uri = pathToFileURL(path);
  const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser, defaultSettingsWithOverwrite({
    style: {
      unusedSuffix: '_unused'
    }
  }));
  const messages = await linter.checkAll();
  expect(messages).toMatchSnapshot();
});