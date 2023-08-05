import { createCommand } from 'commander';
import { ProjectParser, joinURL } from '../projectParser';
import { pathToFileURL } from 'url';
import { cwd } from 'process';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { lintFolder } from './lintFolder';
import { getCodeClimate } from './cliUtil';
import { isAbsolute } from 'path';

export async function cli(argv: string[]) {
  // console.error(argv);
  const program = createCommand('vhdl-linter')
    .description('A typescript based linter for vhdl')
    .argument('<folder>', 'The folder to lint')
    .option('-j, --output-json', 'Output message in json compatible with Code Climate Engine Specification (Gitlab & Github compatible)')
    .option('-e, --exclude <pattern...>', 'Exclude pattern for linting. Use the ignore setting from the `vhdl-linter.yml` file to not parse files at all.')
    .parse(argv);
  const options = program.opts();
  const start = new Date().getTime();
  const outputJson = options.outputJson === true;
  const folder = program.args[0];
  if (folder === undefined) {
    throw Error("No folder given");
  }
  const url = isAbsolute(folder) ? pathToFileURL(folder) : joinURL(pathToFileURL(cwd()), folder);
  const projectParser = await ProjectParser.create([url]);
  const messages = await lintFolder(url, false, outputJson === false, (options.exclude as string[] | undefined) ?? [], projectParser);
  await projectParser.stop();
  if (outputJson) {
    console.log(JSON.stringify(getCodeClimate(messages), undefined, 2));
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
  return messages.length;
}
