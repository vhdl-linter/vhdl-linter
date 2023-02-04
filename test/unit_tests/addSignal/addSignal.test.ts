
import { expect, test } from '@jest/globals';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';

const files = readdirSync(__dirname).filter(file => file.endsWith('.vhd'));
test.each(files)('testing add signal helper %s', async (file: string) => {
  const path = join(__dirname, file);
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);

  const linter = new VhdlLinter(pathToFileURL(path), readFileSync(path, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter);
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
  await projectParser.stop();
});