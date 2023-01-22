
import { expect, test } from '@jest/globals';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';

const files = readdirSync(__dirname).filter(file => file.endsWith('.vhd'));
test.each(files)('testing add use statement actions for file %s', async (file: string) => {
  const path = join(__dirname, file);
  const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }),
    await ProjectParser.create([__dirname], '', defaultSettingsGetter), defaultSettingsGetter);
  await linter.checkAll();

  expect(linter.messages).toMatchSnapshot();
  for (const message of linter.messages) {
    if (typeof message.code === 'string') {
      for (const action of message.code?.split(';') ?? []) {
        const actions = linter.diagnosticCodeActionRegistry[parseInt(action)]('file://dummy.vhd');
        expect(actions).toMatchSnapshot();

      }
    }
  }
});