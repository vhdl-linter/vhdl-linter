// This file runes the test files via jest to allow code coverage
// This is normally disabled because it is super slow
import { expect, test, jest } from '@jest/globals';
import { lstatSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { argv, cwd } from 'process';
import { ProjectParser } from '../lib/project-parser';
import { defaultSettingsGetter, defaultSettingsWithOverwrite } from '../lib/settings';
import { VhdlLinter } from '../lib/vhdl-linter';
function readDirPath(path: string) {
  return readdirSync(path).map(file => join(path, file));
}
// Take each directory in path as a project run test on every file
async function run_test_folder(path: string, error_expected: boolean): Promise<number> {
  let errorCount = 0;

  for (const subPath of readDirPath(path)) {
    errorCount += await run_test(subPath, error_expected);
  }
  return errorCount;
}
// Take path as a project run test on every file
async function run_test(path: string, error_expected: boolean, projectParser?: ProjectParser): Promise<number> {
  let errorCount = 0;
  let createdProjectParser = false;
  if (!projectParser) {
    createdProjectParser = true;
    projectParser = await ProjectParser.create([path], '', defaultSettingsGetter);
  }
  for (const subPath of readDirPath(path)) {
    if (argv.indexOf('--no-osvvm') > -1 && subPath.match(/OSVVM/i)) {
      continue;
    }
    // Exclude OSVVM from resolved/unresolved checker
    const getter = subPath.match(/OSVVM/i)
      ? defaultSettingsWithOverwrite({ style: { preferredLogicTypePort: 'ignore', preferredLogicTypeSignal: 'ignore' } })
      : defaultSettingsGetter;
    if (lstatSync(subPath).isDirectory()) {
      await run_test(subPath, error_expected, projectParser);
    } else if (subPath.match(/\.vhdl?$/i)) {
      const text = readFileSync(subPath, { encoding: 'utf8' });
      const vhdlLinter = new VhdlLinter(subPath, text, projectParser, getter);
      if (vhdlLinter.parsedSuccessfully) {
        await vhdlLinter.checkAll();
      }
      if (error_expected === false) {
        if (vhdlLinter.messages.length !== 0) {
          errorCount++;
        }
      } else {
        if (vhdlLinter.messages.length !== 1) {
          errorCount++;
        }
      }

    }
  }
  if (createdProjectParser) {
    await projectParser.stop();
  }
  return errorCount;
}
(async () => {
  jest.setTimeout(10 * 60 * 1000);
  test('running test file suite', async () => {
    expect(await run_test_folder(join(cwd(), 'test', 'test_files', 'test_error_expected'), true)).toBe(0);
    expect(await run_test_folder(join(cwd(), 'test', 'test_files', 'test_no_error'), false)).toBe(0);
    expect(await run_test(join(cwd(), 'ieee2008'), false)).toBe(0);
  });

})();
