import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { Diagnostic } from 'vscode-languageserver';
import { ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../readFileSyncNorm";

let projectParser: ProjectParser;
let messages: Diagnostic[];
let linter: VhdlLinter;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);
  const url = pathToFileURL(join(__dirname, 'list_parser.vhd'));
  linter = new VhdlLinter(url, readFileSyncNorm(url, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  messages = await linter.checkAll();
});
afterAll(async () => {
  await projectParser.stop();
});
test('Not optional separators in interface list', () => {
  const expectedRange = expect.objectContaining({
    start: expect.objectContaining({
      line: 13,
      character: 22
    }),
    end: expect.objectContaining({
      line: 13,
      character: 23
    })
  });
  const message = messages.find(message => message.message === "Unexpected ';' at end of interface list (parser)");
  expect(message).toBeDefined();
  expect(message).toEqual(
    expect.objectContaining({
      message: "Unexpected ';' at end of interface list (parser)",
      range: expectedRange,
    }),
  );
  const uri = linter.file.uri.toString();
  const solution = linter.diagnosticCodeActionRegistry[parseInt((String(message?.code ?? '').split(';') as [string, ...string[]])[0])]?.(uri);
  expect(solution).toEqual(expect.arrayContaining([
    {
      edit: {
        changes: {
          [uri]: [{
            newText: '',
            range: expectedRange,
          }]
        },
      },
      title: `Remove ';'`,
      kind: 'quickfix'
    }
  ]));
});
test('Not optional separators in association list', () => {

  const expectedRange = expect.objectContaining({
    start: expect.objectContaining({
      line: 6,
      character: 7
    }),
    end: expect.objectContaining({
      line: 6,
      character: 8
    })
  });
  expect.objectContaining({
    message: "Unexpected ',' at end of association list (parser)",
    solution: {
      message: `Remove ','`,
      edits: [{
        newText: '',
        range: expectedRange
      }]
    },
    range: expectedRange,
  });
  const uri = linter.file.uri.toString();

  const message = messages.find(message => message.message === "Unexpected ',' at end of association list (parser)");

  const solution = linter.diagnosticCodeActionRegistry[parseInt((String(message?.code ?? '').split(';') as [string, ...string[]])[0])]?.(uri);
  expect(solution).toEqual(expect.arrayContaining([
    {
      edit: {
        changes: {
          [uri]: [{
            newText: '',
            range: expectedRange,
          }]
        },
      },
      title: `Remove ','`,
      kind: 'quickfix'
    }
  ]));
});