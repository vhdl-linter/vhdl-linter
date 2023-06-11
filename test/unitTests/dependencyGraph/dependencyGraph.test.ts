import { afterAll, beforeAll, test } from '@jest/globals';
import { pathToFileURL } from 'url';
import { DependencyGraph } from '../../../lib/dependency/dependencyGraph';
import { ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsGetter } from '../../../lib/settings';
let projectParser: ProjectParser;

beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL('/home/anton/Documents/hhi/netstack')], '', defaultSettingsGetter);
  // projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);

});
afterAll(async () => {
  await projectParser.stop();
});
test('test basic dependency graph', () => {
  const dependencyGraph = new DependencyGraph(projectParser);
  const start = Date.now();
  dependencyGraph.built();
  console.log(`Builting graph took ${Date.now() - start} ms`);
});