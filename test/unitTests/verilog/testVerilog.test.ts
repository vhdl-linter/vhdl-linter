import { test } from '@jest/globals';
import expect from 'expect';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsWithOverwrite } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from '../../readFileSyncNorm';


test.each([true, false])('Testing verilog switch %b', async enableVerilog => {
  const settingsGetter = defaultSettingsWithOverwrite({
    analysis: {
      verilogAnalysis: enableVerilog
    }
  });
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', settingsGetter);
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