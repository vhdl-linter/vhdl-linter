import { Command, InvalidArgumentError } from '@commander-js/extra-typings';
import { existsSync, lstatSync } from 'fs';
import { isAbsolute, join } from 'path';
import { cwd } from 'process';
import { fileURLToPath, pathToFileURL } from 'url';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { ProjectParser } from '../projectParser';
import { OIDiagnostic } from '../vhdlLinter';
import { getCodeClimate, prettyPrintMessages } from './cliUtil';
import { lintFolder } from './lintFolder';

export async function cli(argv: string[]) {
  const integerParam = (v: string) => {
    const n = Number(v);
    if (Number.isInteger(n)) {
      return n;
    }
    throw new InvalidArgumentError(`Not an integer`);
  };
  const folderParam = (v: string) => {
    const path = isAbsolute(v) ? v : join(cwd(), v);
    if (existsSync(path) === false) {
      throw new InvalidArgumentError("Does not exist");
    }
    if (lstatSync(path).isDirectory() === false) {
      throw new InvalidArgumentError("Is not a directory");
    }
    return pathToFileURL(path);
  };
  const program = new Command('vhdl-linter')
    .description('A typescript based linter for vhdl')
    .argument('<folder>', 'The folder to lint', folderParam)
    .option('-j, --output-json', 'Output message in json compatible with Code Climate Engine Specification (Gitlab & Github compatible)', false)
    .option('-e, --exclude <pattern...>', 'Exclude pattern for linting. Use the ignore setting from the `vhdl-linter.yml` file to not parse files at all.', [])
    .option('-i, --max-info <count>', 'Number of information messages to trigger a nonzero exit code', integerParam, -1)
    .option('-w, --max-warnings <count>', 'Number of information messages to trigger a nonzero exit code', integerParam, -1)
    .parse(argv);
  const options = program.opts();
  const start = new Date().getTime();
  const folder = program.processedArgs[0];
  const projectParser = await ProjectParser.create([folder]);
  const filesWithMessages = await lintFolder(folder, false, options.outputJson === false, options.exclude, projectParser);
  await projectParser.stop();
  const allMessages = filesWithMessages.flatMap(m => m.messages);
  const warningCount = allMessages.filter(m => m?.severity === DiagnosticSeverity.Warning).length;
  const infoCount = allMessages.filter(m => m?.severity === DiagnosticSeverity.Information).length;
  // default is error
  function isError(m: OIDiagnostic) {
    return m?.severity !== DiagnosticSeverity.Warning && m?.severity !== DiagnosticSeverity.Information;
  }
  const errorCount = allMessages.filter(isError).length;
  if (options.outputJson) {
    const rootPath = fileURLToPath(projectParser.workspaces[0]!);
    console.log(JSON.stringify(getCodeClimate(filesWithMessages, rootPath), undefined, 2));
    const filesWithErrors = filesWithMessages.map(fileWithMessages => ({ ...fileWithMessages, messages: fileWithMessages.messages.filter(isError) })).filter(fileWithMessages => fileWithMessages.messages.length > 0);
    console.error(prettyPrintMessages(rootPath, filesWithErrors));
  } else {
    const timeTaken = new Date().getTime() - start;
    console.log(`Linted in ${(timeTaken / 1000).toFixed(2)}s:`);
    console.log(`${errorCount} error(s), ${warningCount} warning(s), ${infoCount} info(s)`);
  }
  if (errorCount > 0) {
    return 1;
  } else if (warningCount > options.maxWarnings && options.maxWarnings !== -1) {
    return 1;
  } else if (infoCount > options.maxInfo && options.maxInfo !== -1) {
    return 1;
  }
  return 0;
}
