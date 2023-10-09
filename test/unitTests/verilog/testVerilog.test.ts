import { expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/projectParser';
import { VerilogParser } from '../../../lib/verilogParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { makeRangePrintable } from '../../helper';
import { readFileSyncNorm } from '../../../lib/cli/readFileSyncNorm';
import { rmSync, writeFileSync } from 'fs';


test.each([true, false])('Testing verilog switch %b', async enableVerilog => {
  const settingsFile = join(__dirname, 'vhdl-linter.yml');
  writeFileSync(settingsFile, JSON.stringify({ analysis: { verilogAnalysis: enableVerilog } }));
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
  const uri = pathToFileURL(join(__dirname, '_test_verilog_instance.vhd'));
  const settings = await projectParser.getDocumentSettings(uri);
  const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser, settings);
  await linter.checkAll();
  if (enableVerilog) {
    expect(linter.messages).toHaveLength(0);
  } else {
    expect(linter.messages).toHaveLength(1);
  }

  rmSync(settingsFile);
  await projectParser.stop();
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
test('test verilog with non ansi header', async () => {
  const uri = pathToFileURL(join(__dirname, 'verilog_non_ansi.sv'));
  const projectParser = await ProjectParser.create([]);
  const verilogParser = new VerilogParser(uri, readFileSyncNorm(uri, { encoding: 'utf8' }), projectParser);
  expect(verilogParser.file.entities).toHaveLength(1);
  expect(verilogParser.file.entities[0]?.ports).toHaveLength(3);
  expect(verilogParser.file.entities[0]?.generics).toHaveLength(3);
})