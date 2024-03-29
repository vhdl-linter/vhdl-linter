import { beforeEach, expect, test } from '@jest/globals';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/projectParser';
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
  await writeFile(join(__dirname, 'test_files/test_entity.vhd'), `
      entity test_entity is
      end entity;`);
  await writeFile(join(__dirname, 'test_files/test_module.sv'), `
      module test_module
      endmodule;`);
});
test('testing removing of vhdl files', async () => {
  const testFilePath = join(__dirname, 'test_files/test_entity.vhd');

  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);

  expect(projectParser.entities.filter(entity => entity.lexerToken.getLText() === 'test_entity')).toHaveLength(1);

  await Promise.all([
    (async () => {
      await wait(100);
      await rm(testFilePath);

    })(),
    new Promise(resolve => projectParser.events.once('change', resolve))
  ]);
  expect(projectParser.entities.filter(entity => entity.lexerToken.getLText() === 'test_entity')).toHaveLength(0);

  await projectParser.stop();
});
test('testing removing of verilog files', async () => {
  const testFilePath = join(__dirname, 'test_files/test_module.sv');

  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);

  expect(projectParser.entities.find(entity => entity.lexerToken.getLText() === 'test_module')).toBeDefined();
  await Promise.all([
    (async () => {
      await wait(100);
      await rm(testFilePath);

    })(),
    new Promise(resolve => projectParser.events.once('change', resolve))
  ]);
  expect(projectParser.entities.find(entity => entity.lexerToken.getLText() === 'test_module')).toBeUndefined();
  await projectParser.stop();
});
test('testing removing of vhdl files by removing parent folder', async () => {

  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);

  expect(projectParser.entities.find(entity => entity.lexerToken.getLText() === 'test_entity')).toBeDefined();

  await Promise.all([
    (async () => {
      await wait(100);
      await rm(join(__dirname, 'test_files'), { recursive: true, force: true });

    })(),
    new Promise<void>(resolve => {
      const handler = (type: string, path: string) => {
        expect(type).toBe('unlink');
        if (path.match(/test_entity.vhd$/)) {
          projectParser.events.off('change', handler);
          resolve();
        }
      };
      projectParser.events.on('change', handler);
    }),
    new Promise<void>(resolve => {
      const handler = (type: string, path: string) => {
        expect(type).toBe('unlink');
        if (path.match(/test_module.sv$/)) {
          projectParser.events.off('change', handler);
          resolve();
        }
      };
      projectParser.events.on('change', handler);
    })
  ]);

  expect(projectParser.entities.find(entity => entity.lexerToken.getLText() === 'test_entity')).toBeUndefined();
  expect(projectParser.entities.find(entity => entity.lexerToken.getLText() === 'test_module')).toBeUndefined();
  await projectParser.stop();
});
test('testing removing of settings file', async () => {
  const testFilePath = join(__dirname, 'test_files/vhdl-linter.yml');
  const defaultValue = defaultSettings.rules['consistent-casing'];
  await writeFile(testFilePath, JSON.stringify({ rules: { 'consistent-casing': !defaultValue } }));

  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
  let settings = await projectParser.getDocumentSettings(pathToFileURL(testFilePath));
  expect(settings.rules['consistent-casing']).toEqual(!defaultValue);
  await Promise.all([
    (async () => {
      await wait(100);
      await rm(testFilePath);
    })(),
    new Promise(resolve => projectParser.events.once('change', resolve))
  ]);
  settings = await projectParser.getDocumentSettings(pathToFileURL(testFilePath));
  expect(settings.rules['consistent-casing']).toEqual(defaultValue);
  await projectParser.stop();
});