import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { Diagnostic } from 'vscode-languageserver';
import { ProjectParser } from '../../../lib/projectParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../../lib/cli/readFileSyncNorm";
import { URL } from 'url';

let projectParser: ProjectParser;
let messages: Diagnostic[];
let linter: VhdlLinter;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);

});
afterAll(async () => {
  await projectParser.stop();
});

test('Missing semicolon handling for assignment parser', async () => {
  const mockPath = {
    toString: () => `file:///dummy.vhd`
  };
  const url = pathToFileURL(join(__dirname, 'assignment-parser.vhd'));

  linter = new VhdlLinter(mockPath as URL, readFileSyncNorm(url, { encoding: 'utf8' }), projectParser, await projectParser.getDocumentSettings(url));
  messages = await linter.checkAll();
  expect(messages).toHaveLength(9);
  expect(messages).toEqual(expect.not.arrayContaining([
    expect.not.objectContaining({
      message: expect.stringMatching(/Unexpected '.+'\. Probably missing a ';'\. \(parser\)/)
    })
  ]));

});