import { expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { Position } from 'vscode-languageserver';
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { findDefinitions } from '../../../lib/languageFeatures/findDefinition';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';

test(`Testing definitions`, async () => {
  const projectParser = await ProjectParser.create([__dirname], '', defaultSettingsGetter);
  const linter = new VhdlLinter('definition.vhd', readFileSync(__dirname + '/definition.vhd', { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter);
  await Elaborate.elaborate(linter);
  for (const character of [13, 14, 15]) {
    const definition = await findDefinitions(linter, Position.create(12, character));
    expect(definition).toHaveLength(1);
    expect(definition[0].targetUri.replace(__dirname, '')).toBe('file:///definition.vhd');
    expect(definition[0].targetRange.start.line).toBe(7);
    expect(definition[0].targetRange.end.line).toBe(7);
    await projectParser.stop();

  }
});