#!/usr/bin/env node
import { program } from 'commander';
import { joinURL } from '../projectParser';
import { pathToFileURL } from 'url';
import { cwd } from 'process';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { run_test } from './cliUtil';

(async () => {
  program
    .name('vhdl-linter-cli')
    .description('A typescript based linter for vhdl')
    .argument('<folder...>', 'The folder to lint')
    .option('-j --output-json', 'Output message in json compatible with Code Climate Engine Specification (Gitlab & Github compatible)')
    .parse();

  const start = new Date().getTime();
  const promises = [];
  const outputJson = program.opts().outputJson === true;
  for (const folder of program.args) {
    const url = joinURL(pathToFileURL(cwd()), folder);
    promises.push(run_test(url, false, outputJson));
  }
  const messages = (await Promise.all(promises)).flat();
  if (outputJson) {
    // console.log(messages[0].location);
    console.log(JSON.stringify(messages, undefined, 2));
  } else {
    const timeTaken = new Date().getTime() - start;
    console.log(`Linted in ${(timeTaken / 1000).toFixed(2)}s:`);

    const allMessages = messages.flatMap(m => m.messages);
    const warningCount = allMessages.filter(m => m?.severity === DiagnosticSeverity.Warning).length;
    const infoCount = allMessages.filter(m => m?.severity === DiagnosticSeverity.Information).length;
    // default is error
    const errorCount = allMessages.filter(m => m?.severity !== DiagnosticSeverity.Warning && m?.severity !== DiagnosticSeverity.Information).length;
    console.log(`${errorCount} error(s), ${warningCount} warning(s), ${infoCount} info(s)`);
  }
  process.exit(messages.length);
})().catch(err => console.error(err));
