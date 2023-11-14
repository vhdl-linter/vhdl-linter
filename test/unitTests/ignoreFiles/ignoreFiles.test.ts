import { expect, test } from '@jest/globals';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { readFileSyncNorm } from '../../../lib/cli/readFileSyncNorm';
import { ProjectParser } from '../../../lib/projectParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';

async function getProjectParser(ignoreGlob: string) {
  const setting = `{paths: {ignoreFiles: ["${ignoreGlob}"]}}`;
  writeFileSync(join(__dirname, "vhdl-linter.yml"), setting);
  return await ProjectParser.create([pathToFileURL(__dirname)]);
}

test.each([
  ["**/*entity*", true], // by filename
  ["**/*no_match*", false], // by filename
  ["**/export/**/*", true], // by last folder
  ["**/modules/**/*", true], // by middle folder
  ["src/*", false], // by first folder
  ["src/**/*", true], // by first folder
])('Test ignore glob "%s". errorExpected: %s', async (ignoreGlob: string, errorExpected: boolean) => {
  const path = join(__dirname, "test_use.vhd");
  const uri = pathToFileURL(path);
  const projectParser = await getProjectParser(ignoreGlob);
  const linter = new VhdlLinter(uri, readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, await projectParser.getDocumentSettings(pathToFileURL(path)));
  await linter.checkAll();
  await projectParser.stop();

  expect(linter.messages).toHaveLength(errorExpected ? 1 : 0);
  if (errorExpected) {
    expect(linter.messages[0]?.message).toEqual("object 'test_entity' is referenced but not declared (not-declared)");
  }
});