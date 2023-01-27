import { test } from '@jest/globals';
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
  const definition = await findDefinitions(linter, Position.create(12, 14));
  console.log(definition)
  console.log(definition[0].text.split('\n').slice(definition[0].targetRange.start.line, definition[0].targetRange.end.line + 1));
  await projectParser.stop();
})