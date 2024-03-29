import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/projectParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../../lib/cli/readFileSyncNorm";
import { overwriteSettings } from '../../../lib/settingsUtil';

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([]);
});
afterAll(async () => {
  await projectParser.stop();
});
test.each([
  'test_port_std_logic_vector.vhd',
  'test_port_std_logic.vhd',
  'test_port_std_ulogic_vector.vhd',
  'test_port_std_ulogic.vhd',
  'test_port_unsigned.vhd',
  'test_port_u_unsigned.vhd',
  'test_signal_std_logic.vhd',
  'test_signal_std_ulogic.vhd',
  'test_record_std_logic.vhd',
  'test_record_std_ulogic.vhd',
].flatMap(file => [[file, 'unresolved'], [file, 'resolved'], [file, 'ignore']]))('testing type_resolved messages for file %s with setting %s', async (file: string, setting: 'unresolved' | 'resolved' | 'ignore') => {

  const path = join(__dirname, file);
  const settings = overwriteSettings(await projectParser.getDocumentSettings(pathToFileURL(path)), {
    style: {
      preferredLogicTypePort: setting,
      preferredLogicTypeSignal: setting,
      preferredLogicTypeRecordChild: setting,
    }
  });
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }), projectParser, settings);
  await linter.checkAll();

  expect(linter.messages).toMatchSnapshot();


});