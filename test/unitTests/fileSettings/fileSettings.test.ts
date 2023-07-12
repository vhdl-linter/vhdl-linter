import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { FileCacheSettings, ProjectParser } from '../../../lib/projectParser';
import { DeepPartial } from 'utility-types';
import { ISettings, defaultSettings } from '../../../lib/settingsGenerated';
import { readdirSync } from 'fs';
import { overwriteSettings } from '../../../lib/settingsUtil';

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
});
afterAll(async () => {
  await projectParser.stop();
});

test.each(
  readdirSync(__dirname).filter(v => v.startsWith('invalid') && v.endsWith('vhdl-linter.yml'))
)("invalid yaml %s", async (fileName) => {
  const url = pathToFileURL(join(__dirname, fileName));
  const fileSettings = await FileCacheSettings.create(url, await ProjectParser.create([]));
  expect(fileSettings.settings).toBeUndefined();
});

test("valid simple yaml", async () => {
  const url = pathToFileURL(join(__dirname, 'simple.vhdl-linter.yml'));
  const fileSettings = await FileCacheSettings.create(url, await ProjectParser.create([]));
  const expected: DeepPartial<ISettings> = { semanticTokens: true };
  expect(fileSettings.settings).toStrictEqual(expected);
});

test("complex yaml", async () => {
  const url = pathToFileURL(join(__dirname, 'complex.vhdl-linter.yml'));
  const fileSettings = await FileCacheSettings.create(url, await ProjectParser.create([]));
  const expected: DeepPartial<ISettings> = {
    semanticTokens: true,
    trace: { server: 'messages' },
    paths: {
      additional: ['apple', 'banana']
    },
    analysis: {
      conditionalAnalysis: { 'pear': 'orange' }
    }
  };
  expect(fileSettings.settings).toStrictEqual(expected);

  // test the overwriteSettings function
  const newSettings = JSON.parse(JSON.stringify(defaultSettings)) as ISettings;
  newSettings.semanticTokens = true;
  newSettings.trace.server = 'messages';
  newSettings.paths.additional = ['apple', 'banana'];
  newSettings.analysis.conditionalAnalysis.pear = 'orange';
  expect(newSettings).toStrictEqual(overwriteSettings(defaultSettings, expected));
});

