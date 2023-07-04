import { expect } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import prand from 'pure-rand';
import { pathToFileURL } from 'url';
import { LinterManager } from '../../../../lib/linterManager';
import { implementsIHasDefinitions, implementsIHasNameLinks } from '../../../../lib/parser/interfaces';
import { ProjectParser } from '../../../../lib/projectParser';
import { defaultSettingsGetter } from '../../../../lib/settings';
import { readFileSyncNorm } from '../../../readFileSyncNorm';

export async function randomTest(directory: string) {
  const projectParser = await ProjectParser.create([pathToFileURL(directory)], defaultSettingsGetter);
  const linterManager = new LinterManager();
  const seed = 42;
  const rng = prand.xoroshiro128plus(seed);

  // This test works likes this:
  // Assuming there is no memory leak, we should reach a maximum amount of definitions in the project after randomly elaborating files
  // This can go down, so we watch the amount of definitions and take the max.
  // After that we randomly elaborate again and check that we do not go over this max.
  // If there is a memory leak there is no maximum definitions and we should go over it, assuming the loop is long enough.
  function getDefinitionCount() {
    const definitions = projectParser.packages?.map(a => a.rootFile.objectList.reduce((prev, obj) => {
      if (implementsIHasDefinitions(obj)) {
        return prev + obj.definitions.length;
      }
      if (implementsIHasNameLinks(obj)) {
        return prev + obj.nameLinks.length;
      }
      return prev;
    }, 0)).reduce((prev, a) => prev + a, 0);
    return definitions;
  }
  let version = 0;
  async function triggerRefresh(filename: string) {
    const url = pathToFileURL(join(directory, filename));
    // (projectParser.watchers is private)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    (projectParser as any).watchers[0].emit('change', join(directory, filename));
    const text = readFileSyncNorm(url, { encoding: 'utf8' });
    const linter = await linterManager.triggerRefresh(url.toString(), text, projectParser, defaultSettingsGetter, version++);
    await linter.checkAll();
  }
  const files = readdirSync(directory).filter(filename => filename.match(/\.vhd$/i));
  let definitions = 0;
  for (let i = 0; i < files.length * 500; i++) {
    await triggerRefresh(files[prand.unsafeUniformIntDistribution(0, files.length - 1, rng)]!);
    definitions = Math.max(definitions, getDefinitionCount());
  }
  // console.log(definitions, getDefinitionCount());
  for (let i = 0; i < files.length * 500; i++) {
    await triggerRefresh(files[prand.unsafeUniformIntDistribution(0, files.length - 1, rng)]!);
    expect(getDefinitionCount()).toBeLessThanOrEqual(definitions);
  }
  await projectParser.stop();
}
