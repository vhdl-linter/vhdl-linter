// This file runes the test files via jest to allow code coverage
// This is normally disabled because it is super slow
import { expect, jest, test } from '@jest/globals';
import { lstatSync, readdirSync } from 'fs';
import { argv, cwd } from 'process';
import { pathToFileURL } from 'url';
import { joinURL, ProjectParser } from '../lib/projectParser';
import { VhdlLinter } from '../lib/vhdlLinter';

import { readFileSyncNorm } from "./readFileSyncNorm";
function readDirPath(path: URL) {
  return readdirSync(path).map(file => joinURL(path, file));
}
// Take each directory in path as a project run test on every file
async function run_test_folder(path: URL, error_expected: boolean): Promise<number> {
  let errorCount = 0;

  for (const subPath of readDirPath(path)) {
    errorCount += await run_test(subPath, error_expected);
  }
  return errorCount;
}
// Take path as a project run test on every file
async function run_test(url: URL, error_expected: boolean, projectParser?: ProjectParser): Promise<number> {
  let errorCount = 0;
  let createdProjectParser = false;
  if (!projectParser) {
    createdProjectParser = true;
    projectParser = await ProjectParser.create([url]);
  }
  for (const subPath of readDirPath(url)) {
    if (argv.includes('--no-osvvm') && subPath.toString().match(/OSVVM/i)) {
      continue;
    }
    if (lstatSync(subPath).isDirectory()) {
      await run_test(subPath, error_expected, projectParser);
    } else if (subPath.pathname.match(/\.vhdl?$/i)) {
      const text = readFileSyncNorm(subPath, { encoding: 'utf8' });
      const vhdlLinter = new VhdlLinter(subPath, text, projectParser, await projectParser.getDocumentSettings(subPath));
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
jest.setTimeout(10 * 60 * 1000);
test('running test file suite', async () => {
  expect(await run_test_folder(joinURL(pathToFileURL(cwd()), 'test', 'test_files', 'test_error_expected'), true)).toBe(0);
  expect(await run_test_folder(joinURL(pathToFileURL(cwd()), 'test', 'test_files', 'test_no_error'), false)).toBe(0);
  expect(await run_test(joinURL(pathToFileURL(cwd()), 'ieee2008'), false)).toBe(0);
});
