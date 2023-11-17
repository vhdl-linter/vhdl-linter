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
  ["**/*entity*", true], // glob dir & file
  ["**/export", true], // should match dir or file
  ["**/modules", true], // by middle folder
  ["src/*", true], // everything in src
  ["src", true], // everything in src
  ["src/modules", true], // everything in src/modules
  ["src/modules/export", true], // everything in src/modules/export
  ["src/**/test_entity.vhd", true],
  ["**/*no_match*", false], // glob dir & file
  ["**/does-not-exist", false], // should match dir
  ["does-not-exist/*", false], // everything in src
  ["does-not-exist", false], // everything in src
  ["src/does-not-exist", false], // everything in src/modules
  ["src/modules/does-not-exist", false], // everything in src/modules/export
  ["src/**/does-not-exist.vhd", false],
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