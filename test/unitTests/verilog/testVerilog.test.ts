import { expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsGetter, defaultSettingsWithOverwrite } from '../../../lib/settings';
import { VerilogParser } from '../../../lib/verilogParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { makeRangePrintable } from '../../helper';
import { readFileSyncNorm } from '../../readFileSyncNorm';


test.each([true, false])('Testing verilog switch %b', async enableVerilog => {
  const settingsGetter = defaultSettingsWithOverwrite({
    analysis: {
      verilogAnalysis: enableVerilog
    }
  });
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], settingsGetter);
  const uri = pathToFileURL(join(__dirname, '_test_verilog_instance.vhd'));
  const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser, settingsGetter());
  await linter.checkAll();
  if (enableVerilog) {
    expect(linter.messages).toHaveLength(0);
  } else {
    expect(linter.messages).toHaveLength(1);

  }

  await projectParser.stop();
});

test('module_advanced', async () => {
  const uri = pathToFileURL(join(__dirname, 'module_advanced.sv'));
  const projectParser = await ProjectParser.create([], defaultSettingsGetter);
  const verilogParser = new VerilogParser(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser);
  expect(verilogParser.file.objectList.map(obj => ({
    range: makeRangePrintable(obj.range),
    lexerToken: obj.lexerToken?.text
  }))).toMatchSnapshot();
});