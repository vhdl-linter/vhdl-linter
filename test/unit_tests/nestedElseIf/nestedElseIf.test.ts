import { expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { OIfGenerate } from '../../../lib/parser/objects';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
import { readFileSyncNorm } from '../rename/rename.test';
test('Testing nested if generate structures', async () => {

  const path = join(__dirname, 'test_nested_elsif.vhd');
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
    await ProjectParser.create([], '', defaultSettingsGetter), defaultSettingsGetter);
  await linter.checkAll();

  expect(linter.messages).toHaveLength(0);
  const topGenerate = linter.file.architectures[0].statements[0] as OIfGenerate;
  expect(topGenerate).toBeInstanceOf(OIfGenerate);
  expect(topGenerate.label.text).toBe('gen');
  expect(topGenerate.range.start.line).toBe(6);
  // the generate label belongs to the generate but not to the first if generate clause
  expect(topGenerate.ifGenerateClauses).toHaveLength(2);
  expect(topGenerate.ifGenerateClauses[0].range.start.line).toBe(7);
  expect(topGenerate.ifGenerateClauses[0].label?.text).toBe('a_label');
  expect(topGenerate.ifGenerateClauses[1].range.start.line).toBe(9);
  expect(topGenerate.ifGenerateClauses[1].label?.text).toBe('b_label');
  expect(topGenerate.elseGenerateClause?.label?.text).toBe('c_label');


  const innerGenerate = topGenerate.ifGenerateClauses[1].statements[0] as OIfGenerate;
  expect(innerGenerate).toBeInstanceOf(OIfGenerate);
  expect(innerGenerate.label.text).toBe('gen_inner');
  expect(innerGenerate.ifGenerateClauses).toHaveLength(3);
  expect(innerGenerate.ifGenerateClauses[0].label?.text).toBe('d_label');
  expect(innerGenerate.ifGenerateClauses[1].label?.text).toBe('e_label');
  expect(innerGenerate.ifGenerateClauses[2].label?.text).toBe('f_label');



});