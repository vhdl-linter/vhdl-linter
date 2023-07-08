import { afterAll, beforeAll, expect, test } from "@jest/globals";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { pathToFileURL } from "url";
import { joinURL, ProjectParser } from "../../../lib/projectParser";
import { VhdlLinter } from "../../../lib/vhdlLinter";
import { readFileSyncNorm } from "../../readFileSyncNorm";
import { getDocumentSettings } from "../../../lib/settingsManager";
let projectParser: ProjectParser;
const filesURL = pathToFileURL(join(__dirname, 'tortureFiles'));
const tortureEntityURL = joinURL(filesURL, 'torture_entity.vhd');

beforeAll(async () => {
  try {
    await mkdir(filesURL);
  } catch (err) {
    if ((err as { code?: string })?.code !== 'EEXIST') {
      throw err;
    }
  }
  const testLength = 100 * 1000;
  const text = `entity torture_entity is
end torture_entity;

architecture arch of torture_entity is
signal a : integer;
signal b : integer;
begin
  ${Array(testLength).fill(0).map(() => `  a <= b;\n`).join('')}
end architecture;
`;
  await writeFile(tortureEntityURL, text);
  projectParser = await ProjectParser.create([filesURL]);
});
afterAll(async () => {
  await projectParser.stop();
});
test('test project parser', () => {
  expect(projectParser.cachedFiles).toEqual(expect.arrayContaining([
    expect.objectContaining({
      uri: tortureEntityURL
    })
  ]));
});
test('direct parsing of file', async () => {
  const linter = new VhdlLinter(tortureEntityURL, readFileSyncNorm(tortureEntityURL, { encoding: 'utf8' }),
    projectParser, await getDocumentSettings(tortureEntityURL, projectParser));
  expect(linter.file.lexerTokens).toBeDefined();
  expect(linter.file.lexerTokens.length).toBeGreaterThan(0);
});