import { beforeEach, expect, test } from '@jest/globals';
import { mkdir, rename, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/projectParser';
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
test('testing moving of vhdl files', async () => {
  const oldFileURL = pathToFileURL(join(__dirname, 'test_files/test_entity.vhd'));
  const newFileURL = pathToFileURL(join(__dirname, 'test_files/test_entity_new.vhd'));

  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);

  expect(projectParser.entities.filter(entity => entity.lexerToken.getLText() === 'test_entity')).toHaveLength(1);
  await Promise.all([
    (async () => {
      await wait(100);
      await rename(oldFileURL, newFileURL);

    })(),
    new Promise<void>(resolve => {
      const handler = (type: string, path: string) => {
        if (type == 'unlink' && path === oldFileURL.toString()) {
          projectParser.events.off('change', handler);
          resolve();
        }
      };
      projectParser.events.on('change', handler);
    }),
    new Promise<void>(resolve => {
      const handler = (type: string, path: string) => {
        if (type == 'add' && path === newFileURL.toString()) {
          projectParser.events.off('change', handler);
          resolve();
        }
      };
      projectParser.events.on('change', handler);
    })
  ]);

  expect(projectParser.entities.filter(entity => entity.lexerToken.getLText() === 'test_entity')).toHaveLength(1);

  await projectParser.stop();
});
test('testing moving of sv files', async () => {
  const oldFileURL = pathToFileURL(join(__dirname, 'test_files/test_module.sv'));
  const newFileURL = pathToFileURL(join(__dirname, 'test_files/test_module_new.sv'));

  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);

  expect(projectParser.entities.filter(entity => entity.lexerToken.getLText() === 'test_module')).toHaveLength(1);
  await Promise.all([
    (async () => {
      await wait(100);
      await rename(oldFileURL, newFileURL);

    })(),
    new Promise<void>(resolve => {
      const handler = (type: string, path: string) => {
        if (type == 'unlink' && path === oldFileURL.toString()) {
          projectParser.events.off('change', handler);
          resolve();
        }
      };
      projectParser.events.on('change', handler);
    }),
    new Promise<void>(resolve => {
      const handler = (type: string, path: string) => {
        if (type == 'add' && path === newFileURL.toString()) {
          projectParser.events.off('change', handler);
          resolve();
        }
      };
      projectParser.events.on('change', handler);
    })
  ]);

  expect(projectParser.entities.filter(entity => entity.lexerToken.getLText() === 'test_module')).toHaveLength(1);

  await projectParser.stop();
});
