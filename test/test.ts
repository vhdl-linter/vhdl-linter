import { readdirSync } from 'fs';
import { cwd } from 'process';
import { pathToFileURL } from 'url';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { isMainThread, Worker } from 'worker_threads';
import { OIRange } from '../lib/parser/objects';
import { joinURL } from '../lib/projectParser';
import { OIDiagnostic } from '../lib/vhdlLinter';
import PQueue from 'p-queue';
const queue = new PQueue({ concurrency: 8 });
export function readDirPath(path: URL) {
  return readdirSync(path).map(file => joinURL(path, file));
}
export interface MessageWrapper {
  file: string,
  messages: (OIDiagnostic | { message: string })[]
}
function isOIDiagnostic(obj: unknown): obj is OIDiagnostic {
  if ((obj as OIDiagnostic).range instanceof OIRange) {
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
export function prettyPrintMessages(messages: MessageWrapper[]) {
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
async function run_test_folder(path: URL, error_expected: boolean): Promise<MessageWrapper[]> {
  const messageWrappers: MessageWrapper[] = [];

  const messages = (await Promise.all(readDirPath(path).map(async subPath => await run_test(subPath, error_expected)))).flat();
  messageWrappers.push(...messages);
  return messageWrappers;
}
// Take path as a project run test on every file
async function run_test(path: URL, error_expected: boolean): Promise<MessageWrapper[]> {
  return await queue.add(() => {
    const worker = new Worker(__dirname + '/testWorker.js', { workerData: { path: path.toString(), error_expected } });
    return new Promise((resolve, reject) => {

      worker.on("message", msg => resolve(msg as MessageWrapper[]));
      worker.on("error", err => reject(err));
    });
  });


}
(async () => {
  if (isMainThread) {
    console.log('Starting tests on test_files');
    const start = new Date().getTime();
    const promises = [];
    promises.push(run_test_folder(joinURL(pathToFileURL(cwd()), 'test', 'test_files', 'test_error_expected'), true));
    promises.push(run_test_folder(joinURL(pathToFileURL(cwd()), 'test', 'test_files', 'test_no_error'), false));
    promises.push(run_test(joinURL(pathToFileURL(cwd()), 'ieee2008'), false));
    const messages = (await Promise.all(promises)).flat();
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
  }
})().catch(err => console.error(err));
