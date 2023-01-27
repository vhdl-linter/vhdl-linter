import { lstatSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { argv, cwd } from 'process';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { OIRange } from '../lib/parser/objects';
import { ProjectParser } from '../lib/project-parser';
import { defaultSettingsGetter, defaultSettingsWithOverwrite } from '../lib/settings';
import { OIDiagnostic, VhdlLinter } from '../lib/vhdl-linter';
function readDirPath(path: string) {
  return readdirSync(path).map(file => join(path, file));
}
interface MessageWrapper {
  file: string,
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
    return message.messages.slice(0, 5).map((innerMessage) => {
      const messageText = `${getMessageColor(innerMessage)}${innerMessage.message}\u001b[0m`;
      if (isOIDiagnostic(innerMessage)) {
        return `${filename}:${innerMessage.range.start.line + 1} (r: ${innerMessage.range.start.line}:${innerMessage.range.start.character} - ${innerMessage.range.end.line}:${innerMessage.range.end.character})\n  ${messageText}`; // lines are 0 based in OI
      }
      return `${filename}\n  ${messageText}`;
    }).join('\n') + (message.messages.length > 5 ? `\n\u001b[31m ... and ${message.messages.length - 5} more\u001b[0m` : '');
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
    projectParser = await ProjectParser.create([path], '', defaultSettingsGetter);
  }
  for (const subPath of readDirPath(path)) {
    if (argv.indexOf('--no-osvvm') > -1 && subPath.match(/OSVVM/i)) {
      continue;
    }
    // Exclude OSVVM and IEEE from resolved/unresolved checker
    const getter = subPath.match(/OSVVM/i) || subPath.match(/ieee/i)
    ? defaultSettingsWithOverwrite({ style: { preferredLogicTypePort: 'ignore', preferredLogicTypeSignal: 'ignore' } })
    : defaultSettingsGetter;
    if (lstatSync(subPath).isDirectory()) {
      messageWrappers.push(...await run_test(subPath, error_expected, projectParser));
    } else if (subPath.match(/\.vhdl?$/i)) {
      const text = readFileSync(subPath, { encoding: 'utf8' });
      const vhdlLinter = new VhdlLinter(subPath, text, projectParser, getter);
      if (vhdlLinter.parsedSuccessfully) {
        await vhdlLinter.checkAll();
      }
      if (error_expected === false) {
        if (vhdlLinter.messages.length > 0) {
          const newMessage = {
            file: subPath,
            messages: vhdlLinter.messages
          };
          messageWrappers.push(newMessage);
          console.log(prettyPrintMessages([newMessage]));
        }
      } else {
        if (vhdlLinter.messages.length !== 1) {
          const newMessage = {
            file: subPath,
            messages: [...vhdlLinter.messages, { message: `One message expected found ${vhdlLinter.messages.length}` }]
          };
          messageWrappers.push(newMessage);
          console.log(prettyPrintMessages([newMessage]));

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
  let timeOutError = 0;
  const TIMEOUT_TIME = 130;
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
