#!/usr/bin/env node
import { program } from 'commander';
import { MessageWrapper } from './cliUtil';
import { isMainThread, Worker } from 'worker_threads';
import { cpus } from 'os';
import PQueue from 'p-queue';
import { joinURL } from '../projectParser';
import { pathToFileURL } from 'url';
import { cwd } from 'process';
import { OIDiagnostic } from "../vhdlLinter";
import { DiagnosticSeverity } from 'vscode-languageserver';
const threadNum = cpus().length / 2;
const queue = new PQueue({ concurrency: threadNum });

// Take path as a project run test on every file
async function run_test(path: URL, error_expected: boolean): Promise<MessageWrapper[]> {
  return await queue.add(() => {
    const worker = new Worker(__dirname + '/lintWorker.js', { workerData: { path: path.toString(), error_expected } });
    return new Promise((resolve, reject) => {
      worker.on("message", msg => resolve(msg as MessageWrapper[]));
      worker.on("error", err => reject(err));
    });
  });
}
(async () => {
  if (isMainThread) {

    program
      .name('vhdl-linter-cli')
      .description('A typescript based linter for vhdl')
      .argument('<folder>', 'The folder to lint')
      // TODO:
      // .option('-j --output-json', 'Output json errors instead of human readable messages')
      .parse();

    const start = new Date().getTime();
    const promises = [];
    for (const folder of program.args) {
      const url = joinURL(pathToFileURL(cwd()), folder);
      promises.push(run_test(url, false));
    }
    const messages = (await Promise.all(promises)).flat();
    const timeTaken = new Date().getTime() - start;
    console.log(`Linted in ${(timeTaken / 1000).toFixed(2)}s:`);
    const allMessages = messages.flatMap(m => m.messages);
    const errorCount = allMessages.filter(m => (m as OIDiagnostic)?.severity === DiagnosticSeverity.Error).length;
    const warningCount = allMessages.filter(m => (m as OIDiagnostic)?.severity === DiagnosticSeverity.Warning).length;
    const infoCount = allMessages.filter(m => (m as OIDiagnostic)?.severity === DiagnosticSeverity.Information).length;
    console.log(`${errorCount} errors, ${warningCount} warnings, ${infoCount} infos`);
    process.exit(messages.length);
  }
})().catch(err => console.error(err));
