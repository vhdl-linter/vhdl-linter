import { expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/projectParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../readFileSyncNorm";
import { overwriteSettings } from '../../../lib/settingsUtil';
test.each([
  'signal',
  'variable',
  'constant',
  'generic',
  'out',
  'in',
  'inout',
  'parameterOut',
  'parameterIn',
  'parameterInout',
  'instantiationLabel',
  'unused'
].flatMap(file => [[file, 'pre_', ''], [file, '', '_suf']]))('testing naming style for %s with prefix "%s" and suffix "%s"', async (file: string, prefix: string, suffix: string) => {
  const overwrite: Record<string, string> = {};
  overwrite[`${file}Prefix`] = prefix;
  overwrite[`${file}Suffix`] = suffix;
  const path = join(__dirname, `${file}.vhd`);
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
  const settings = overwriteSettings(await projectParser.getDocumentSettings(pathToFileURL(path)) , {
    style: overwrite
  });
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, settings);
  await linter.checkAll();

  expect(linter.messages).toMatchSnapshot();
  const codes = linter.messages.filter(message => file ==='unused' ? message.message.includes('(unused)') : message.message.includes('(naming-style)')).map(message => String(message.code ?? '').split(String(';'))).flat();
  const solutions = (await Promise.all(codes.map(async code => await linter.diagnosticCodeActionResolveRegistry[parseInt(code)]?.(linter.uri.toString())))).flat()
    .filter(solution => solution?.title.includes('Replace with'));
  expect(solutions.map(solution => ({
    ...solution,
    edit: solution?.edit?.changes?.[pathToFileURL(path).toString()],

  }))).toMatchSnapshot();
  await projectParser.stop();
});