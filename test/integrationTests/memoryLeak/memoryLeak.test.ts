import { expect, test } from '@jest/globals';
import { ProjectParser } from '../../../lib/projectParser';
import { pathToFileURL } from 'url';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from '../../readFileSyncNorm';
import { join } from 'path';
import { OContext } from '../../../lib/parser/objects';

test('testing multi elaborate for memory leak', async () => {
  const file = 'dummy.vhd';
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], defaultSettingsGetter);
  const path = join(__dirname, file);
  async function runTest() {
    const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
      projectParser, defaultSettingsGetter());
    await linter.checkAll();

    expect(linter.file.entities[0]?.contextReferences[0]?.names.at(-1)?.definitions.length).toBe(1);

    const context = linter.file.entities[0]?.contextReferences[0]?.names.at(-1)?.definitions[0] as OContext;
    const useClauseDefinitions = context.useClauses.find(useClause => useClause.names[1]?.nameToken.getLText() === 'pkg')?.names.at(-1)?.definitions;
    expect(useClauseDefinitions).toHaveLength(1);

  }
  await runTest();
  await runTest();

  await projectParser.stop();
});