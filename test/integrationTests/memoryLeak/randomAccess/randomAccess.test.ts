import { jest, test } from '@jest/globals';
import { randomTest } from './randomTest';
import { readDirPath } from '../../../testUtil';
import { fileURLToPath, pathToFileURL } from 'url';
import {  statSync } from 'fs';
jest.setTimeout(10000);
test.each(readDirPath(pathToFileURL(__dirname)).filter(url => statSync(url).isDirectory()))('memory leak test with random access for folder %s', async (folder: URL) => {
  await randomTest(fileURLToPath(folder));
});
jest.setTimeout(120000);
