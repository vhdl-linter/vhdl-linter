import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { Diagnostic } from 'vscode-languageserver';
import { ProjectParser } from '../../../lib/projectParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../readFileSyncNorm";

let projectParser: ProjectParser;
let messages: Diagnostic[];
let linter: VhdlLinter;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);

});
afterAll(async () => {
  await projectParser.stop();
});

test('Missing semicolon handling', async () => {
  const mockUrl = {
    toString: () => `file:///dummy.vhd`
  } as URL;
  const url = pathToFileURL(join(__dirname, 'object_declaration_parser.vhd'));

  linter = new VhdlLinter(mockUrl, readFileSyncNorm(url, { encoding: 'utf8' }), projectParser, await projectParser.getDocumentSettings(url));
  messages = await linter.checkAll();
  expect(messages).toHaveLength(7);
  expect(messages).toEqual(expect.not.arrayContaining([
    expect.not.objectContaining({
      message: expect.stringMatching(/Unexpected \w+ in object declaration. Assuming forgotten ';' \(parser\)/)
    })
  ]));
  for (const message of messages) {
    const codes = String(message.code ?? '').split(String(';'));
    const solutions = (await Promise.all(codes.map(async code => await linter.diagnosticCodeActionRegistry[parseInt(code)]?.(linter.uri.toString())))).flat();
    expect(solutions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: `Insert ';'`
      })
    ]));
    expect(solutions.filter(solution => solution?.title === `Insert ';'`)).toMatchSnapshot();


  }
});