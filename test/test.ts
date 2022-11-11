import { OIDiagnostic, VhdlLinter } from '../lib/vhdl-linter';
import { cwd } from 'process';
import { readdirSync, readFileSync, lstatSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ProjectParser } from '../lib/project-parser';
import { OIRange } from '../lib/parser/objects';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { defaultSettingsGetter } from '../lib/settings';
import { describe, expect, test } from '@jest/globals';
function readDirPath(path: string) {
  return readdirSync(path).map(file => join(path, file));
}
interface MessageWrapper {
  file: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: (OIDiagnostic | { message: string })[]
}
function isOIDiagnostic(obj: unknown): obj is OIDiagnostic {
  if ((obj as OIDiagnostic)?.range instanceof OIRange) {
    return true;
  }
  return false;
}
function getMessageColor(message: OIDiagnostic | { message: string }) {
  if (isOIDiagnostic(message) && message.severity === DiagnosticSeverity.Error) {
    return '\u001b[31m';
  } else if (isOIDiagnostic(message) && message.severity === DiagnosticSeverity.Warning) {
    return '\u001b[33m';
  }
  return '\u001b[34m';
}
function prettyPrintMessages(messages: MessageWrapper[]) {
  return messages.map(message => {
    const filename = message.file.replace(cwd(), '');
    return message.messages.map((innerMessage) => {
      const messageText = `${getMessageColor(innerMessage)}${innerMessage.message}\u001b[0m`;
      if (isOIDiagnostic(innerMessage)) {
        return `${filename}:${innerMessage.range.start.line + 1} (r: ${innerMessage.range.start.line}:${innerMessage.range.start.character} - ${innerMessage.range.end.line}:${innerMessage.range.end.character})\n  ${messageText}`; // lines are 0 based in OI
      }
      return `${filename}\n  ${messageText}`;
    }).join('\n');
  }).join('\n');
}
// Take each directory in path as a project run test on every file
function start_test_folder(path: string, error_expected: boolean) {

  for (const subPath of readDirPath(path)) {
    start_test(subPath, error_expected);
  }
}
export function start_test(path: string, error_expected: boolean) {
  test.concurrent(`Testing Path ${path}`, async () => {
    const projectParser = await ProjectParser.create([path], '', defaultSettingsGetter);
    await run_test(path, error_expected, projectParser);
  }, 120000);
}
// Take path as a project run test on every file
async function run_test(path: string, error_expected: boolean, projectParser: ProjectParser): Promise<MessageWrapper[]> {
  const messageWrappers: MessageWrapper[] = [];
  for (const subPath of readDirPath(path)) {
    if (lstatSync(subPath).isDirectory()) {
      messageWrappers.push(...await run_test(subPath, error_expected, projectParser));
    } else if (subPath.match(/\.vhdl?$/i)) {
      const text = readFileSync(subPath, { encoding: 'utf8' });
      const vhdlLinter = new VhdlLinter(subPath, text, projectParser, defaultSettingsGetter);
      await vhdlLinter.checkAll();
      if (error_expected === false) {
        expect(vhdlLinter.messages.length).toBe(0);
        if (vhdlLinter.messages.length > 0) {
          messageWrappers.push({
            file: subPath,
            messages: vhdlLinter.messages
          });
        }
      } else {
        expect(vhdlLinter.messages.length).toBe(1);

        if (vhdlLinter.messages.length !== 1) {

          messageWrappers.push({
            file: subPath,
            messages: [...vhdlLinter.messages, { message: `One message expected found ${vhdlLinter.messages.length}` }]
          });
        }
      }


    }
  }

  return messageWrappers;
}
const start = new Date().getTime();
// start_test_folder(join(cwd(), 'test', 'test_files', 'test_error_expected'), true);
start_test(join(cwd(), 'ieee2008'), false);
// if (messages.length > 0) {
//   // console.log(messages.map(file => file.file));
//   console.log(prettyPrintMessages(messages));
// }
console.log("---- Summary of files with error: ");
  // for (const message of messages) {
  //   console.log(message.file);
  // }
