
import { expect, test } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
import { readFileSyncNorm } from "../../readFileSyncNorm";

const files = readdirSync(__dirname).filter(file => file.endsWith('.vhd'));
test.each(files)('testing library list %s', async (file: string) => {
  const path = join(__dirname, file);
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);

  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter);

  expect(linter.file).toBeDefined();
  expect(linter.file.entities).toHaveLength(1);
  expect(linter.file.entities[0].libraries.map(l => l.lexerToken.getLText())).toContain('std'); // default lib
  expect(linter.file.entities[0].libraries.map(l => l.lexerToken.getLText())).toContain('work'); // default lib
  expect(linter.file.entities[0].libraries.map(l => l.lexerToken.getLText())).toContain('ieee');
  expect(linter.file.entities[0].libraries.map(l => l.lexerToken.getLText())).toContain('test');

  await projectParser.stop();
});