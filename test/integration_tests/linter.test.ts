import { expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../lib/project-parser';
import { defaultSettingsGetter } from '../../lib/settings';
import { VhdlLinter } from '../../lib/vhdl-linter';

test('E2E test of linter with instantiation', async () => {
  const filename = join(__dirname, 'test_inst.vhd');
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter, true);
  const linter = new VhdlLinter(pathToFileURL(filename), readFileSync(filename, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter);
  const diagnostic = await linter.checkAll();
  expect(diagnostic.length).toBe(1);
  expect(diagnostic[0].message).toContain('(instantiation)');
  expect(diagnostic[0].range.start.line).toBe(7);
});