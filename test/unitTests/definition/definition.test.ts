import { beforeAll, expect, test } from '@jest/globals';
import { pathToFileURL } from 'url';
import { Position } from 'vscode-languageserver';
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { findDefinitionLinks } from '../../../lib/languageFeatures/findDefinition';
import { ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../readFileSyncNorm";
let linter: VhdlLinter;
let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);
  const URL = pathToFileURL(__dirname + '/definition.vhd');
  linter = new VhdlLinter(URL, readFileSyncNorm(URL, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter());
  await Elaborate.elaborate(linter);
  await projectParser.stop();
});
test(`Testing definitions`, () => {
  for (const character of [13, 14, 15, 21, 22]) {
    const definition = findDefinitionLinks(linter, Position.create(12, character));
    expect(definition).toHaveLength(1);
    expect(definition[0]?.targetUri.replace(pathToFileURL(__dirname).toString(), '')).toBe('/definition.vhd');
    expect(definition[0]?.targetRange.start.line).toBe(7);
    expect(definition[0]?.targetRange.end.line).toBe(7);
  }
});
test(`Testing empty definitions`, () => {
  const definition = findDefinitionLinks(linter, Position.create(24, 0));
  expect(definition).toHaveLength(0);
  const definition2 = findDefinitionLinks(linter, Position.create(6, 0));
  expect(definition2).toHaveLength(0);
});
test(`Testing definition for actual without formal`, () => {
  const definition = findDefinitionLinks(linter, Position.create(16, 9));
  expect(definition).toHaveLength(1);
  expect(definition[0]?.targetUri.replace(pathToFileURL(__dirname).toString(), '')).toBe('/definition.vhd');
  expect(definition[0]?.targetRange.start.line).toBe(7);
  expect(definition[0]?.targetRange.end.line).toBe(7);
});
test(`Testing definition for literal actual without formal`, () => {
  const definition = findDefinitionLinks(linter, Position.create(20, 7));
  expect(definition).toHaveLength(0);
});
test(`Testing definition for actual in instantiation which can not be elaborated`, () => {
  const definition = findDefinitionLinks(linter, Position.create(20, 7));
  expect(definition).toHaveLength(0);
});