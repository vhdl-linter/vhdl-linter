import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { OAssignment, OChoice } from '../../../lib/parser/objects';
import { ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../readFileSyncNorm";

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});

test('Testing elaboration of choice', async () => {
  const path = join(__dirname, 'test_choice.vhd');
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  await Elaborate.elaborate(linter);

  const assignment = linter.file.architectures[0]?.statements[0] as OAssignment;
  const choice = assignment.names.find(name => name instanceof OChoice);
  expect(choice).toBeDefined();
  expect(choice?.nameToken.text).toBe('ID');
  expect(choice?.definitions.length).toBe(1);
});
