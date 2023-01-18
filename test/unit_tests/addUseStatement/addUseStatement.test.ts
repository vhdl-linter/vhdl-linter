
import { expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
import { URI } from 'vscode-uri';

test.each([
  'arch.vhd',
  'entity.vhd',
  'entityWithLibrary.vhd'
])('testing add use statement actions for file %s', async (file: string) => {
  const path = join(__dirname, file);
  const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }),
    await ProjectParser.create([], '', defaultSettingsGetter), defaultSettingsGetter);
  await linter.checkAll();

  expect(linter.messages).toMatchSnapshot();
  for (const message of linter.messages) {
    if (typeof message.code === 'string') {
      for (const action of message.code?.split(';') ?? []) {
        expect(linter.diagnosticCodeActionRegistry[parseInt(action)](URI.file(linter.file.file).toString())).toMatchSnapshot();

      }
    }
  }
});