import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { fileURLToPath, pathToFileURL } from 'url';
import { ConfigurationItem } from "vscode-languageserver";
import { ProjectParser, joinURL } from '../../../lib/projectParser';
import { defaultSettings } from '../../../lib/settingsGenerated';
import { currentCapabilities, overwriteSettings } from '../../../lib/settingsUtil';
import { readFileSyncNorm } from '../../../lib/cli/readFileSyncNorm';
import { VhdlLinter } from '../../../lib/vhdlLinter';


// ignore test_entity in module_b and expect test_inst only module b to give an error

const mockedVsCodeWorkspace = {
  getConfiguration: (item: ConfigurationItem) => {
    if (item.scopeUri?.endsWith('module_b')) {
      return overwriteSettings(defaultSettings, { paths: { ignoreFiles: ['test_entity*.vhd'] } });
    }
    return defaultSettings;
  }
};

let projectParser: ProjectParser;
beforeAll(async () => {
  currentCapabilities.configuration = true;
  const moduleA = joinURL(pathToFileURL(__dirname), 'module_a');
  const moduleB = joinURL(pathToFileURL(__dirname), 'module_b');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  projectParser = await ProjectParser.create([moduleA, moduleB], undefined, undefined, mockedVsCodeWorkspace as any);
});
afterAll(async () => {
  await projectParser.stop();
});

test('module a', async () => {
  const inst_file = joinURL(pathToFileURL(__dirname), 'module_a', 'test_inst.vhd');
  const linter = new VhdlLinter(inst_file, readFileSyncNorm(fileURLToPath(inst_file), { encoding: 'utf8' }), projectParser, await projectParser.getDocumentSettings(inst_file));
  const diagnostic = await linter.checkAll();
  expect(diagnostic).toHaveLength(0);
});
test('module b', async () => {
  const inst_file = joinURL(pathToFileURL(__dirname), 'module_b', 'test_inst.vhd');
  const linter = new VhdlLinter(inst_file, readFileSyncNorm(fileURLToPath(inst_file), { encoding: 'utf8' }), projectParser, await projectParser.getDocumentSettings(inst_file));
  const diagnostic = await linter.checkAll();
  expect(diagnostic).toHaveLength(1);
});