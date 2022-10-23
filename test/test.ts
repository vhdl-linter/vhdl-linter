import { VhdlLinter } from '../lib/vhdl-linter';
import { cwd } from 'process';
import { readdirSync, readFileSync, lstatSync } from 'fs';
import { join } from 'path';
import { ProjectParser } from '../lib/project-parser';
import { } from 'vscode';
function readDirPath(path: string) {
  return readdirSync(path).map(file => join(path, file));
}
interface MessageWrapper {
  file: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any
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
    projectParser = new ProjectParser([path], '');
    await projectParser.init();
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
        if (vhdlLinter.messages.length === 0) {
          messageWrappers.push({
            file: subPath,
            messages: 'Message expected found none'
          });
        }
      }
    }
  }
  if (messageWrappers.length > 0) {
    // console.log(messages.map(file => file.file));
    console.log(JSON.stringify(messageWrappers, null, 2));
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
  const TIMEOUT_TIME = 40;
  if (timeTaken > TIMEOUT_TIME * 1000) {
    console.error(`Time toke more than ${TIMEOUT_TIME}s (${timeTaken / 1000}s)`);
    timeOutError++;
  } else {
    console.log(`Test took ${timeTaken / 1000}s`);
  }
  console.log("---- Summary of files with error: ");
  for (const message of messages) {
    console.log(message.file);
  }
  process.exit(messages.length + timeOutError);
})();
