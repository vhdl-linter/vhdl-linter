import { afterAll, beforeAll, expect, test } from "@jest/globals";
import { writeFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { ProjectParser } from "../../../lib/projectParser";
import { defaultSettingsGetter } from "../../../lib/settings";
import { VhdlLinter } from "../../../lib/vhdlLinter";
import { readFileSyncNorm } from "../../readFileSyncNorm";

let projectParser: ProjectParser;
// Building test sets.
// The Entity is in library 'libA'.
// The Instantiation's architecture is placed in either libA, libB or unspecified.
// When in the instantiation a explicit library is specified, it shall match the entities (libA).
// If there is work there. The library of the instantiations architecture shall either match or be unspecified (than match is assumed)
const testSet: [string, boolean][] = [];
const targetLibraries = [undefined, 'libA', 'libB'];
const instantiationLibraries = ['work', 'libA', 'libB'];
const types = ['configuration', 'entity', 'package'];
for (const targetLibrary of targetLibraries) {
  for (const instantiationLibrary of instantiationLibraries) {
    for (const type of types) {
      const filename = `${targetLibrary ?? 'libUnspecified'}.${instantiationLibrary}.${type}.instantiation.vhd`;
      const shouldNotError = instantiationLibrary === 'work' ? (targetLibrary === 'libA' || targetLibrary === undefined)
        : instantiationLibrary === 'libA';
      testSet.push([filename, shouldNotError]);
      const content = type === 'package' ? `
use ${instantiationLibrary}.test_package.all;
entity dummy is
end entity;` :
        `entity test_instantiation is
end entity;
architecture arch of test_instantiation is
  begin
  label: ${type} ${instantiationLibrary}.test_entity${type === 'configuration' ? '_cfg' : ''};
end architecture;`;

      writeFileSync(join(__dirname, filename), `
-- autogenerated do not change (should not error: ${shouldNotError ? 'true' : 'false'})
${targetLibrary !== undefined ? `--! @library ${targetLibrary}` : ''}
library libB;
library libA;
${content}`);
    }
  }
}
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});
test.each(testSet)('Testing magic comments on file %s should not Error %p', async (filename, shouldNotError) => {

  const path = join(__dirname, filename);
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter());
  const messages = await linter.checkAll();
  if (shouldNotError) {
    expect(messages.length).toBe(0);
  } else {
    expect(messages.length).toBe(1);
  }

});