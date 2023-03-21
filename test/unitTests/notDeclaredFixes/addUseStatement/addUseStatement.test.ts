
import { expect, test } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../../lib/projectParser';
import { defaultSettingsGetter } from '../../../../lib/settings';
import { VhdlLinter } from '../../../../lib/vhdlLinter';
import { sanitizeActions } from '../../../helper';
import { readFileSyncNorm } from "../../../readFileSyncNorm";

const files = readdirSync(__dirname).filter(file => file.endsWith('.vhd'));
test.each(files)('testing add use statement actions for file %s', async (file: string) => {
  const path = join(__dirname, file);
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);
  const linter = new VhdlLinter(pathToFileURL('/dummy.vhd'), readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter);
  await linter.checkAll();

  expect(linter.messages).toMatchSnapshot();
  for (const message of linter.messages) {
    if (typeof message.code === 'string') {
      for (const action of message.code.split(';')) {

        const actions = await Promise.all(await linter.diagnosticCodeActionRegistry[parseInt(action)]?.('file:///dummy.vhd') ?? []);
        sanitizeActions(actions);
        expect(actions).toMatchSnapshot();
      }

    }
  }
  await projectParser.stop();
});