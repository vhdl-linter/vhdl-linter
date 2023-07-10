import { beforeEach, expect, test } from '@jest/globals';
import { ProjectParser } from '../../../lib/projectParser';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { mkdir, rm, writeFile } from 'fs/promises';
import { defaultSettings } from '../../../lib/settingsGenerated';

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
beforeEach(async () => {
  try {
    await rm(join(__dirname, 'test_files'), { recursive: true, force: true });
  } catch (err) {
    // Ignore if not exists
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (err?.code !== 'ENOENT') {
      throw err;
    }
  }
  try {
    await mkdir(join(__dirname, 'test_files'));
  } catch (err) {
    // Ignore if not exists
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (err?.code !== 'EEXIST') {
      throw err;
    }
  }
});
test('testing adding of vhdl files', async () => {
  const testFilePath = join(__dirname, 'test_files/test_entity.vhd');

  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
  expect(projectParser.entities).toHaveLength(0);
  await Promise.all([
    (async () => {
      await wait(100);
      await writeFile(testFilePath, `
      entity test_entity is
      end entity;`);

    })(),
    new Promise(resolve => projectParser.events.once('change', resolve))
  ]);
  expect(projectParser.entities).toHaveLength(1);
  await projectParser.stop();
});
test('testing adding of verilog files', async () => {
  const testFilePath = join(__dirname, 'test_files/test_entity.sv');

  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
  expect(projectParser.entities).toHaveLength(0);
  await Promise.all([
    (async () => {
      await wait(100);
      await writeFile(testFilePath, `
      module test_entity
      endmodule;`);

    })(),
    new Promise(resolve => projectParser.events.once('change', resolve))
  ]);
  expect(projectParser.entities).toHaveLength(1);
  await projectParser.stop();
});
test('testing adding of settings file', async () => {
  const testFilePath = join(__dirname, 'test_files/vhdl-linter.yml');
  const defaultValue = defaultSettings.rules['consistent-casing'];

  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
  let settings = await projectParser.getDocumentSettings(pathToFileURL(testFilePath));
  expect(settings.rules['consistent-casing']).toEqual(defaultValue);
  await Promise.all([
    (async () => {
      await wait(100);
      await writeFile(testFilePath, JSON.stringify({ rules: { 'consistent-casing': !defaultValue } }));

    })(),
    new Promise(resolve => projectParser.events.once('change', resolve))
  ]);
  settings = await projectParser.getDocumentSettings(pathToFileURL(testFilePath));
  expect(settings.rules['consistent-casing']).toEqual(!defaultValue);
  await projectParser.stop();
});
test('testing changing of settings file', async () => {
  const testFilePath = join(__dirname, 'test_files/vhdl-linter.yml');
  const defaultValue = defaultSettings.rules['consistent-casing'];
  // write !default value and change it to default
  await writeFile(testFilePath, JSON.stringify({ rules: { 'consistent-casing': !defaultValue } }));

  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
  let settings = await projectParser.getDocumentSettings(pathToFileURL(testFilePath));
  expect(settings.rules['consistent-casing']).toEqual(!defaultValue);
  await Promise.all([
    (async () => {
      await wait(100);
      await writeFile(testFilePath, JSON.stringify({ rules: { 'consistent-casing': defaultValue } }));

    })(),
    new Promise(resolve => projectParser.events.once('change', resolve))
  ]);
  settings = await projectParser.getDocumentSettings(pathToFileURL(testFilePath));
  expect(settings.rules['consistent-casing']).toEqual(defaultValue);
  await projectParser.stop();
});