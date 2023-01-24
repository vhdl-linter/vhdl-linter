import { expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { OIfGenerate } from '../../../lib/parser/objects';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
test('Testing nested if generate structures', async () => {

  const path = join(__dirname, 'test_nested_elsif.vhd');
  const linter = new VhdlLinter(path, readFileSync(path, { encoding: 'utf8' }),
    await ProjectParser.create([], '', defaultSettingsGetter), defaultSettingsGetter);
  await linter.checkAll();

  expect(linter.messages).toHaveLength(0);
  const topGenerate = linter.file.architectures[0].statements[0] as OIfGenerate;
  expect(topGenerate).toBeInstanceOf(OIfGenerate);
  expect(topGenerate.label.text).toBe('gen');
  expect(topGenerate.ifGenerates).toHaveLength(2);
  expect(topGenerate.ifGenerates[0].range.start.line).toBe(6);
  expect(topGenerate.ifGenerates[0].label?.text).toBe('a_label');
  expect(topGenerate.ifGenerates[1].range.start.line).toBe(9);
  expect(topGenerate.ifGenerates[1].label?.text).toBe('b_label');
  expect(topGenerate.elseGenerate?.label?.text).toBe('c_label');


  const innerGenerate = topGenerate.ifGenerates[1].statements[0] as OIfGenerate;
  expect(innerGenerate).toBeInstanceOf(OIfGenerate);
  expect(innerGenerate.label.text).toBe('gen_inner');
  expect(innerGenerate.ifGenerates).toHaveLength(3);
  expect(innerGenerate.ifGenerates[0].label?.text).toBe('d_label');
  expect(innerGenerate.ifGenerates[1].label?.text).toBe('e_label');
  expect(innerGenerate.ifGenerates[2].label?.text).toBe('f_label');



});