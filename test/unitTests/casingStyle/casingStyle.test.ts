import { expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsWithOverwrite } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../readFileSyncNorm";
test.each([
  'object',
  'constantGeneric',
].flatMap(file => [
  [file, 'snake_case'],
  [file, 'PascalCase'],
  [file, 'camelCase'],
  [file, 'CONSTANT_CASE'],
  [file, 'ignore']
]))('testing casing style for %s with %s"', async (file: string, casing: 'snake_case' | 'PascalCase' | 'camelCase' | 'CONSTANT_CASE' | 'ignore') => {
  const overwrite: Record<string, string> = {};
  overwrite[`${file}Casing`] = casing;
  const getter = defaultSettingsWithOverwrite({
    style: overwrite
  });
  const path = join(__dirname, `${file}.vhd`);
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], getter);
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, getter());
  await linter.checkAll();

  expect(linter.messages).toMatchSnapshot();
  const codes = linter.messages.filter(message => message.message.includes('(casing-style)')).map(message => String(message.code ?? '').split(String(';'))).flat();
  const solutions = (await Promise.all(codes.map(async code => await linter.diagnosticCodeActionResolveRegistry[parseInt(code)]?.(linter.uri.toString())))).flat()
    .filter(solution => solution?.title.includes('Replace with'));
  expect(solutions.map(solution => ({
    ...solution,
    edit: solution?.edit?.changes?.[pathToFileURL(path).toString()],

  }))).toMatchSnapshot();
  await projectParser.stop();
});