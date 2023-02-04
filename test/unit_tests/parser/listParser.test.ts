import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Diagnostic } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';

let projectParser: ProjectParser;
let messages: Diagnostic[];
let linter: VhdlLinter;
beforeAll(async () => {
  projectParser = await ProjectParser.create([__dirname], '', defaultSettingsGetter);
  const path = join(__dirname, 'listParser.vhd');
  linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }), projectParser, defaultSettingsGetter);
  messages = await linter.checkAll();
});
afterAll(async () => {
  await projectParser.stop();
});
test('Not optional separators in interface list', async () => {
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
  const uri = URI.file(linter.file.file).toString();
  const solution = linter.diagnosticCodeActionRegistry[parseInt(String(message?.code ?? '').split(';')[0])]?.(uri);
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
test('Not optional separators in association list', async () => {

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
  const uri = URI.file(linter.file.file).toString();

  const message = messages.find(message => message.message === "Unexpected ',' at end of association list (parser)");

  const solution = linter.diagnosticCodeActionRegistry[parseInt(String(message?.code ?? '').split(';')[0])]?.(uri);
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