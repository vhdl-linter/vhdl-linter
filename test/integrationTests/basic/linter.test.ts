import { expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/projectParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../readFileSyncNorm";
import { getDocumentSettings } from '../../../lib/settingsManager';

test('E2E test of linter with instantiation', async () => {
  const filename = join(__dirname, 'test_inst.vhd');
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], true);
  const linter = new VhdlLinter(pathToFileURL(filename), readFileSyncNorm(filename, { encoding: 'utf8' }),
    projectParser, await getDocumentSettings(pathToFileURL(filename), projectParser));
  const diagnostic = await linter.checkAll();
  expect(diagnostic.length).toBe(1);
  expect(diagnostic[0]?.message).toContain('(instantiation)');
  expect(diagnostic[0]?.range.start.line).toBe(7);
});