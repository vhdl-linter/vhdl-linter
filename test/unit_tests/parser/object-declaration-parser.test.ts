import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { Diagnostic } from 'vscode-languageserver';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
import { readFileSyncNorm } from "../../readFileSyncNorm";
let projectParser: ProjectParser;
let messages: Diagnostic[];
let linter: VhdlLinter;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);

});
afterAll(async () => {
  await projectParser.stop();
});

test('Missing semicolon handling', async () => {
  const mockPath = {
    toString: () => `file:///dummy.vhd`
  };
  const url = pathToFileURL(join(__dirname, 'object-declaration-parser.vhd'));

  linter = new VhdlLinter(mockPath as URL, readFileSyncNorm(url, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  messages = await linter.checkAll();
  expect(messages).toHaveLength(8);
  expect(messages).toEqual(expect.not.arrayContaining([
    expect.not.objectContaining({
      message: expect.stringMatching(/Unexpected \w+ in object declaration. Assuming forgotten ';' \(parser\)/)
    })
  ]));
  for (const message of messages) {
    const codes = String(message.code ?? '').split(String(';'));
    const solutions = codes.flatMap(code => linter.diagnosticCodeActionRegistry[parseInt(code)]?.(linter.uri.toString()));
    expect(solutions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: `Insert ';'`
      })
    ]));
    expect(solutions.filter(solution => solution?.title === `Insert ';'`)).toMatchSnapshot();


  }
});