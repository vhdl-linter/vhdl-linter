import { expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/projectParser';
import { VerilogParser } from '../../../lib/verilogParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { makeRangePrintable } from '../../helper';
import { readFileSyncNorm } from '../../readFileSyncNorm';
import { getDocumentSettings } from '../../../lib/settingsManager';
import { rmSync, writeFileSync } from 'fs';


test.each([true, false])('Testing verilog switch %b', async enableVerilog => {
  const settingsFile = join(__dirname, 'vhdl-linter.yml');
  writeFileSync(settingsFile, JSON.stringify({ analysis: { verilogAnalysis: enableVerilog } }));
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
  const uri = pathToFileURL(join(__dirname, '_test_verilog_instance.vhd'));
  const settings = await getDocumentSettings(uri, projectParser);
  const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser, settings);
  await linter.checkAll();
  if (enableVerilog) {
    expect(linter.messages).toHaveLength(0);
  } else {
    expect(linter.messages).toHaveLength(1);
  }

  await projectParser.stop();
  rmSync(settingsFile);
});

test('module_advanced', async () => {
  const uri = pathToFileURL(join(__dirname, 'module_advanced.sv'));
  const projectParser = await ProjectParser.create([]);
  const verilogParser = new VerilogParser(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser);
  expect(verilogParser.file.objectList.map(obj => ({
    range: makeRangePrintable(obj.range),
    lexerToken: obj.lexerToken?.text
  }))).toMatchSnapshot();
});