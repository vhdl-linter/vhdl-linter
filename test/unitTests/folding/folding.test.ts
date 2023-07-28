import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { foldingHandler } from '../../../lib/languageFeatures/folding';
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
)('Testing folding ranges of %s', async (fileName) => {
  const path = join(__dirname, fileName);
  const uri = pathToFileURL(path);
  const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser, await projectParser.getDocumentSettings(uri));
  const symbols = foldingHandler(linter);
  expect(symbols).toMatchSnapshot();
});