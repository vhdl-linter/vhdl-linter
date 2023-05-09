import { test } from '@jest/globals';
import { ProjectParser } from '../../../lib/projectParser';
import { pathToFileURL } from 'url';
import { defaultSettingsGetter } from '../../../lib/settings';

test('Running project parser on folder with infinite recursive symlink', async () => {
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);
  // Give Chokidar time to fail
  await (new Promise(resolve => setTimeout(resolve, 1000)));
  await projectParser.stop();
})