import { beforeAll, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { Position } from 'vscode-languageserver';
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { findDefinitions } from '../../../lib/languageFeatures/findDefinition';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
let linter: VhdlLinter;
let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);
  const URL = pathToFileURL(__dirname + '/definition.vhd');
  linter = new VhdlLinter(URL, readFileSync(URL, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter);
  await Elaborate.elaborate(linter);
  await projectParser.stop();
});
test(`Testing definitions`, async () => {
  for (const character of [13, 14, 15, 21, 22]) {
    const definition = await findDefinitions(linter, Position.create(12, character));
    expect(definition).toHaveLength(1);
    expect(definition[0].targetUri.replace(__dirname, '')).toBe('file:///definition.vhd');
    expect(definition[0].targetRange.start.line).toBe(7);
    expect(definition[0].targetRange.end.line).toBe(7);
  }
});
test(`Testing empty definitions`, async () => {
  const definition = await findDefinitions(linter, Position.create(24, 0));
  expect(definition).toHaveLength(0);
  const definition2 = await findDefinitions(linter, Position.create(6, 0));
  expect(definition2).toHaveLength(0);
});
test(`Testing definition for actual without formal`, async () => {
  const definition = await findDefinitions(linter, Position.create(16, 9));
  expect(definition).toHaveLength(1);
  expect(definition[0].targetUri.replace(__dirname, '')).toBe('file:///definition.vhd');
  expect(definition[0].targetRange.start.line).toBe(7);
  expect(definition[0].targetRange.end.line).toBe(7);
});
test(`Testing definition for literal actual without formal`, async () => {
  const definition = await findDefinitions(linter, Position.create(20, 7));
  expect(definition).toHaveLength(0);
});
test(`Testing definition for actual in instantiation which can not be elaborated`, async () => {
  const definition = await findDefinitions(linter, Position.create(20, 7));
  expect(definition).toHaveLength(0);
});