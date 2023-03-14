import { expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsWithOverwrite } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../readFileSyncNorm";
test.each([
  'signal',
  'variable',
  'constant',
  'generic',
  'out',
  'in',
  'inout',
  'instantiationLabel',
].flatMap(file => [[file, 'pre_', ''], [file, '', '_suf']]))('testing naming style for %s with prefix "%s" and suffix "%s"', async (file: string, prefix: string, suffix: string) => {
  const overwrite: Record<string, string> = {};
  overwrite[`${file}Prefix`] = prefix;
  overwrite[`${file}Suffix`] = suffix;
  const getter = defaultSettingsWithOverwrite({
    style: overwrite
  });
  const path = join(__dirname, `${file}.vhd`);
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
    await ProjectParser.create([], '', getter), getter);
  await linter.checkAll();

  expect(linter.messages).toMatchSnapshot();


});