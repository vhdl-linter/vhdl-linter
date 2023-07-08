import { beforeEach, expect, test } from '@jest/globals';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsGetter } from '../../../lib/settings';
async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
beforeEach(async () => {
  try {
    await rm(join(__dirname, 'testfiles'), { recursive: true, force: true });
  } catch (err) {
    // Ignore if not exists
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (err?.code !== 'ENOENT') {
      throw err;
    }
  }
  try {
    await mkdir(join(__dirname, 'testfiles'));
  } catch (err) {
    // Ignore if not exists
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (err?.code !== 'EEXIST') {
      throw err;
    }
  }
  await writeFile(join(__dirname, 'testfiles/test_entity.vhd'), `
      entity test_entity is
      end entity;`);
  await writeFile(join(__dirname, 'testfiles/test_entity.sv'), `
      module test_module
      endmodule;`);
});
test('testing removing of vhdl files', async () => {
  const testFilePath = join(__dirname, 'testfiles/test_entity.vhd');

  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], defaultSettingsGetter);

  expect(projectParser.entities.find(entity => entity.lexerToken.getLText() === 'test_entity')).toBeDefined();
  await Promise.all([
    (async () => {
      await wait(100);
      await rm(testFilePath);

    })(),
    new Promise(resolve => projectParser.events.once('change', resolve))
  ]);
  expect(projectParser.entities.find(entity => entity.lexerToken.getLText() === 'test_entity')).toBeUndefined();
  await projectParser.stop();
});
test('testing removing of verilog files', async () => {
  const testFilePath = join(__dirname, 'testfiles/test_entity.sv');

  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], defaultSettingsGetter);

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

  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], defaultSettingsGetter);

  expect(projectParser.entities.find(entity => entity.lexerToken.getLText() === 'test_entity')).toBeDefined();
  await Promise.all([
    (async () => {
      await wait(100);
      await rm(join(__dirname, 'testfiles'), { recursive: true, force: true });

    })(),
    new Promise(resolve => projectParser.events.once('change', resolve))
  ]);
  expect(projectParser.entities.find(entity => entity.lexerToken.getLText() === 'test_entity')).toBeUndefined();
  await projectParser.stop();
});