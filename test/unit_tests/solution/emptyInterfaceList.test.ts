import { expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
test.each([
  'empty_interface_list_generic.vhd',
  'empty_interface_list_parameter.vhd',
  'empty_interface_list.vhd',
])('testing solutions for file %s', async (filename: string) => {
  const path = join(__dirname, filename);
  const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }),
    await ProjectParser.create([], '', defaultSettingsGetter), defaultSettingsGetter);
  const changes = linter.diagnosticCodeActionRegistry
  .map(callback => callback(path)).flat()
  .map(actions => {
    return Object.values(actions.edit?.changes ?? {})
  }).flat(2);

  expect(changes).toHaveLength(1);
  expect(changes).toMatchSnapshot();
});
