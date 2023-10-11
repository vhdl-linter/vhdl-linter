
import { expect, test } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../../lib/projectParser';
import { VhdlLinter } from '../../../../lib/vhdlLinter';
import { sanitizeActions } from '../../../helper';
import { readFileSyncNorm } from "../../../../lib/cli/readFileSyncNorm";
import { CancellationTokenSource } from 'vscode-languageserver';


const files = readdirSync(__dirname).filter(file => file.endsWith('.vhd'));
test.each(files)('testing add signal helper %s', async (file: string) => {
  const path = join(__dirname, file);
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);

  const linter = new VhdlLinter(pathToFileURL(`/${file}`), readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, await projectParser.getDocumentSettings(pathToFileURL(`/${file}`)));
  await linter.checkAll();

  expect(linter.messages).toMatchSnapshot();
  for (const message of linter.messages) {
    if (typeof message.code === 'string') {
      for (const action of message.code.split(';')) {
        const actions = await Promise.all(await linter.diagnosticCodeActionRegistry[parseInt(action)]?.(`file:///${file}`, new CancellationTokenSource().token) ?? []);
        sanitizeActions(actions);
        expect(actions).toMatchSnapshot();

      }
    }
  }
  await projectParser.stop();
});