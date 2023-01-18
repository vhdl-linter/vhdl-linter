import { expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsWithOverwrite } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
test.each([
  'test_port_std_logic_vector.vhd',
  'test_port_std_logic.vhd',
  'test_port_std_ulogic_vector.vhd',
  'test_port_std_ulogic.vhd',
  'test_port_unsigned.vhd',
  'test_port_u_unsigned.vhd',
  'test_signal_std_logic.vhd',
  'test_signal_std_ulogic.vhd',
].flatMap(file => [[file, 'unresolved'], [file, 'resolved'], [file, 'ignore']]))('testing type_resolved messages for file %s with setting %s', async (file: string, setting: 'unresolved' | 'resolved' | 'ignore') => {

  const getter = defaultSettingsWithOverwrite({
    style: {
      preferredLogicTypePort: setting,
      preferredLogicTypeSignal: setting
    }
  });
  const path = join(__dirname, file);
  const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }),
    await ProjectParser.create([], '', getter), getter);
  await linter.checkAll();

  expect(linter.messages).toMatchSnapshot();


});