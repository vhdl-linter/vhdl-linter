import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { OAssignment, OInstantiation, ORecordChild, OSelectedNameRead, OSelectedNameWrite, OSubprogram } from '../../../lib/parser/objects';
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

test.each([
  'test_selected_name.vhd',
  'test_selected_name_array.vhd',
])('Testing definitions of %s', async (fileName) => {
  const path = join(__dirname, fileName);
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  await Elaborate.elaborate(linter);

  const assignment = linter.file.architectures[0]?.statements[0] as OAssignment;
  expect(assignment.references).toHaveLength(2);
  expect(assignment.references[1]).toBeInstanceOf(OSelectedNameRead);
  expect(assignment.references[1]?.definitions).toHaveLength(1);
  expect(assignment.references[1]?.definitions[0]).toBeInstanceOf(ORecordChild);
  expect(assignment.references[1]?.definitions[0]?.lexerToken?.getLText()).toBe('apple');

  expect(assignment.writes).toHaveLength(2);
  expect(assignment.writes[1]).toBeInstanceOf(OSelectedNameWrite);
  expect(assignment.writes[1]?.definitions).toHaveLength(1);
  expect(assignment.writes[1]?.definitions[0]).toBeInstanceOf(ORecordChild);
  expect(assignment.writes[1]?.definitions[0]?.lexerToken?.getLText()).toBe('banana');
});

test.each([
  'test_protected_type.vhd',
  // array of protected types is not allowed (5.3.1 "It is an error if a composite type contains elements of file types or protected types.")
])('Testing definitions of %s', async (fileName) => {
  const path = join(__dirname, fileName);
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  await linter.checkAll();

  const call = linter.file.architectures[0]?.statements[0] as OInstantiation;
  expect(call.definitions).toHaveLength(1);
  expect(call.definitions[0]).toBeInstanceOf(OSubprogram);
  expect(call.definitions[0]?.lexerToken?.getLText()).toBe('apple');

  expect(call.portAssociationList?.children).toHaveLength(1);
  expect(call.portAssociationList?.children[0]?.actualIfInput).toHaveLength(2);
  expect(call.portAssociationList?.children[0]?.actualIfInput[1]).toBeInstanceOf(OSelectedNameRead);
  expect(call.portAssociationList?.children[0]?.actualIfInput[1]).toBeInstanceOf(OSelectedNameRead);
  expect(call.portAssociationList?.children[0]?.actualIfInput[1]?.definitions).toHaveLength(1);
  expect(call.portAssociationList?.children[0]?.actualIfInput[1]?.definitions[0]).toBeInstanceOf(OSubprogram);
  expect(call.portAssociationList?.children[0]?.actualIfInput[1]?.definitions[0]?.lexerToken?.getLText()).toBe('banana');


  expect(linter.messages).toEqual(expect.arrayContaining([
    expect.objectContaining({
      range: expect.objectContaining({
        start: expect.objectContaining({
          line: 20,
          character: 11,
        }),
        end: expect.objectContaining({
          line: 20,
          character: 17,
        }),
      }),
      message: expect.stringContaining('orange does not exist on protected type')
    }),
    // expect this when parsing selectedNames for instantiations
    // expect.objectContaining({
    //   range: expect.objectContaining({
    //     start: expect.objectContaining({
    //       line: 20,
    //       character: 4,
    //     }),
    //     end: expect.objectContaining({
    //       line: 20,
    //       character: 8,
    //     }),
    //   }),
    //   message: expect.stringContaining('kiwi does not exist on protected type')
    // })
  ]));

});

test.each([
  'test_selected_name_recursive.vhd',
  'test_selected_name_complex.vhd',
])('Testing definitions of %s', async (fileName) => {
  const path = join(__dirname, fileName);
  const linter = new VhdlLinter(pathToFileURL(path),readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  await Elaborate.elaborate(linter);

  const assignment = linter.file.architectures[0]?.statements[0] as OAssignment;
  expect(assignment.references).toHaveLength(3);
  expect(assignment.references[1]).toBeInstanceOf(OSelectedNameRead);
  expect(assignment.references[1]?.definitions).toHaveLength(1);
  expect(assignment.references[1]?.definitions[0]).toBeInstanceOf(ORecordChild);
  expect(assignment.references[1]?.definitions[0]?.lexerToken?.getLText()).toBe('banana');
  expect(assignment.references[2]).toBeInstanceOf(OSelectedNameRead);
  expect(assignment.references[2]?.definitions).toHaveLength(1);
  expect(assignment.references[2]?.definitions[0]).toBeInstanceOf(ORecordChild);
  expect(assignment.references[2]?.definitions[0]?.lexerToken?.getLText()).toBe('apple');

  expect(assignment.writes).toHaveLength(2);
  expect(assignment.writes[1]).toBeInstanceOf(OSelectedNameWrite);
  expect(assignment.writes[1]?.definitions).toHaveLength(1);
  expect(assignment.writes[1]?.definitions[0]).toBeInstanceOf(ORecordChild);
  expect(assignment.writes[1]?.definitions[0]?.lexerToken?.getLText()).toBe('apple');
});