import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { OAssignment, ORecordChild, OSelectedNameRead, OSelectedNameWrite } from '../../../lib/parser/objects';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
import { readFileSyncNorm } from '../rename/rename.test';

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});

test.each([
  'test_selected_name.vhd',
  'test_selected_name_array.vhd',
])('Testing definitions of %s', async (fileName) => {
  const path = join(__dirname, fileName);
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  await Elaborate.elaborate(linter);

  const assignment = linter.file.architectures[0].statements[0] as OAssignment;
  expect(assignment.references).toHaveLength(2);
  expect(assignment.references[1]).toBeInstanceOf(OSelectedNameRead);
  expect(assignment.references[1].definitions).toHaveLength(1);
  expect(assignment.references[1].definitions[0]).toBeInstanceOf(ORecordChild);
  expect(assignment.references[1].definitions[0].lexerToken?.getLText()).toBe('apple');

  expect(assignment.writes).toHaveLength(2);
  expect(assignment.writes[1]).toBeInstanceOf(OSelectedNameWrite);
  expect(assignment.writes[1].definitions).toHaveLength(1);
  expect(assignment.writes[1].definitions[0]).toBeInstanceOf(ORecordChild);
  expect(assignment.writes[1].definitions[0].lexerToken?.getLText()).toBe('banana');
});

test.each([
  'test_selected_name_recursive.vhd',
  'test_selected_name_complex.vhd',
])('Testing definitions of %s', async (fileName) => {
  const path = join(__dirname, fileName);
  const linter = new VhdlLinter(pathToFileURL(path),readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  await Elaborate.elaborate(linter);

  const assignment = linter.file.architectures[0].statements[0] as OAssignment;
  expect(assignment.references).toHaveLength(3);
  expect(assignment.references[1]).toBeInstanceOf(OSelectedNameRead);
  expect(assignment.references[1].definitions).toHaveLength(1);
  expect(assignment.references[1].definitions[0]).toBeInstanceOf(ORecordChild);
  expect(assignment.references[1].definitions[0].lexerToken?.getLText()).toBe('banana');
  expect(assignment.references[2]).toBeInstanceOf(OSelectedNameRead);
  expect(assignment.references[2].definitions).toHaveLength(1);
  expect(assignment.references[2].definitions[0]).toBeInstanceOf(ORecordChild);
  expect(assignment.references[2].definitions[0].lexerToken?.getLText()).toBe('apple');

  expect(assignment.writes).toHaveLength(2);
  expect(assignment.writes[1]).toBeInstanceOf(OSelectedNameWrite);
  expect(assignment.writes[1].definitions).toHaveLength(1);
  expect(assignment.writes[1].definitions[0]).toBeInstanceOf(ORecordChild);
  expect(assignment.writes[1].definitions[0].lexerToken?.getLText()).toBe('apple');
});