import { jest, test } from '@jest/globals';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { randomTest } from "./randomTest";
import { readDirPath } from '../../../../lib/cli/cliUtil';
jest.setTimeout(60 * 60 * 1000);
// This test takes forever...
test.skip('memory leak test with random access walk', async () => {

  const dirs = (readDirPath(pathToFileURL(join(__dirname, '..', '..', '..', 'test_files', 'test_no_error'))));
  for (const dir of dirs) {
    if (dir.pathname.match('OSVVM')) {
      continue;
    }
    // console.log(`testing ${dir.pathname}`)
    await randomTest(fileURLToPath(dir));
  }
});