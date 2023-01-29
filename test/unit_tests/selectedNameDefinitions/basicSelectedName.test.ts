import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { OAssignment, ORecordChild, OSelectedNameRead, OSelectedNameWrite } from '../../../lib/parser/objects';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([__dirname], '', defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});

test('Testing definitions of selected name', async () => {
  const path = join(__dirname, 'test_selected_name.vhd');
  const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
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

test('Testing definitions of selected name array', async () => {
  const path = join(__dirname, 'test_selected_name_array.vhd');
  const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
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