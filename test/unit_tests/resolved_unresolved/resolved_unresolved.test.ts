import { expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter, defaultSettingsWithOverwrite } from '../../../lib/settings';
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
])('testing messages for unresolved resolved with file %s', async (file: string) => {

  {
    const path = join(__dirname, file);
    const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }),
      await ProjectParser.create([], '', defaultSettingsGetter), defaultSettingsGetter);
    await linter.checkAll();

    expect(linter.messages).toMatchSnapshot();
  }
  {
    const getter = defaultSettingsWithOverwrite({
      style: {
        preferredLogicTypePort: 'resolved',
        preferredLogicTypeSignal: 'resolved'
      }
    });
    const path = join(__dirname, file);
    const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }),
      await ProjectParser.create([], '', getter), getter);
    await linter.checkAll();

    expect(linter.messages).toMatchSnapshot();
  }

});