import { jest, test } from '@jest/globals';
import { randomTest } from './randomTest';
import { fileURLToPath, pathToFileURL } from 'url';
import { statSync } from 'fs';
import { readDirPath } from '../../../../lib/cli/cliUtil';
jest.setTimeout(120 * 1000);
test.skip.each(readDirPath(pathToFileURL(__dirname)).filter(url => statSync(url).isDirectory()))('memory leak test with random access for folder %s', async (folder: URL) => {
  await randomTest(fileURLToPath(folder));
});
