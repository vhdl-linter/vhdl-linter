import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { foldingHandler } from '../../../lib/languageFeatures/folding';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
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
)('Testing folding ranges of %s', (fileName) => {
  const path = join(__dirname, fileName);
  const uri = pathToFileURL(path);
  const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  const symbols = foldingHandler(linter);
  expect(symbols).toMatchSnapshot();
});