import { OIDiagnostic, VhdlLinter } from '../lib/vhdl-linter';
import { cwd } from 'process';
import { readdirSync, readFileSync, lstatSync } from 'fs';
import { join } from 'path';
import { ProjectParser } from '../lib/project-parser';
import { } from 'vscode';
import { OIRange } from '../lib/parser/objects';
import { DiagnosticSeverity } from 'vscode-languageserver';
function readDirPath(path: string) {
  return readdirSync(path).map(file => join(path, file));
}
interface MessageWrapper {
  file: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages:( OIDiagnostic | { message: string})[]
}
function isOIDiagnostic(obj: unknown): obj is OIDiagnostic {
  if ((obj as OIDiagnostic)?.range instanceof OIRange) {
    return true;
  }
  return false;
}
function getMessageColor(message: OIDiagnostic | { message: string}) {
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
async function run_test_folder(path: string, error_expected: boolean): Promise<MessageWrapper[]> {
  const messageWrappers: MessageWrapper[] = [];

  for (const subPath of readDirPath(path)) {
    messageWrappers.push(...await run_test(subPath, error_expected));
  }
  return messageWrappers;
}
// Take path as a project run test on every file
async function run_test(path: string, error_expected: boolean, projectParser?: ProjectParser): Promise<MessageWrapper[]> {
  const messageWrappers: MessageWrapper[] = [];
  if (!projectParser) {
    projectParser = await ProjectParser.create([path], '');
  }
  for (const subPath of readDirPath(path)) {
    if (lstatSync(subPath).isDirectory()) {
      messageWrappers.push(...await run_test(subPath, error_expected, projectParser));
    } else if (subPath.match(/\.vhdl?$/i)) {
      const text = readFileSync(subPath, { encoding: 'utf8' });
      const vhdlLinter = new VhdlLinter(subPath, text, projectParser);
      await vhdlLinter.checkAll();
      if (error_expected === false) {
        if (vhdlLinter.messages.length > 0) {
          messageWrappers.push({
            file: subPath,
            messages: vhdlLinter.messages
          });
        }
      } else {
        if (vhdlLinter.messages.length !== 1) {
          messageWrappers.push({
            file: subPath,
            messages: [...vhdlLinter.messages, {message: `One message expected found ${vhdlLinter.messages.length}`}]
          });
        }
      }


    }
  }

  return messageWrappers;
}
(async () => {
  const start = new Date().getTime();
  const messages = [];
  messages.push(... await run_test_folder(join(cwd(), 'test', 'test_files', 'test_error_expected'), true));
  messages.push(... await run_test_folder(join(cwd(), 'test', 'test_files', 'test_no_error'), false));
  messages.push(... await run_test(join(cwd(), 'ieee2008'), false));
  const timeTaken = new Date().getTime() - start;
  if (messages.length > 0) {
    // console.log(messages.map(file => file.file));
    console.log(prettyPrintMessages(messages));
  }
  let timeOutError = 0;
  const TIMEOUT_TIME = 45;
  if (timeTaken > TIMEOUT_TIME * 1000) {
    console.error(`Time toke more than ${TIMEOUT_TIME}s (${timeTaken / 1000} s)`);
    timeOutError++;
  } else {
    console.log(`Test took ${timeTaken / 1000} s`);
  }
  console.log("---- Summary of files with error: ");
  for (const message of messages) {
    console.log(message.file);
  }
  process.exit(messages.length + timeOutError);
})();
