import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { getCompletions } from '../../../lib/languageFeatures/completion';
import { ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsGetter, defaultSettingsWithOverwrite } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { createPrintablePosition } from '../../helper';
import { readFileSyncNorm } from "../../readFileSyncNorm";
let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});

test.each([
  ['lowercase', 'std_ulogic_vector', 'STD_ULOGIC_VECTOR'],
  ['UPPERCASE', 'STD_ULOGIC_VECTOR', 'std_ulogic_vector']
])('testing completion %s shall contain %s shall not contain %s', async (ieeeCasing, shallContain, shallNotContain) => {
  const uri = pathToFileURL(join(__dirname, 'test_completion.vhd'));
  const getter = defaultSettingsWithOverwrite({
    style:
    {
      ieeeCasing: ieeeCasing as 'lowercase' | 'UPPERCASE'
    }
  });
  const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }),
    await ProjectParser.create([], '', getter), getter);
  await Elaborate.elaborate(linter);
  const completion = await getCompletions(linter, { line: 9, character: 13 });
  expect(completion).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        "label": shallContain
      })
    ])
  );
  expect(completion).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        "label": shallNotContain
      })
    ])
  );
});


test.each([
  ['test_completion.vhd', createPrintablePosition(11, 18), ['u_unsigned'], []],
  ['test_completion.vhd', createPrintablePosition(15, 11), ['test_port'], []],
  ['test_completion.vhd', createPrintablePosition(17, 1), ['all', 'procedure'], []],
  ['test_completion_record.vhd', createPrintablePosition(25, 10), ['foo'], ['a', 'b', 'banana', 'apple']],
  ['test_completion_record.vhd', createPrintablePosition(26, 11), ['foo'], ['a', 'b', 'banana', 'apple']],
  ['test_completion_record.vhd', createPrintablePosition(27, 14), ['banana'], ['a', 'b', 'foo', 'apple']],
  ['test_completion_record.vhd', createPrintablePosition(28, 15), ['banana'], ['a', 'b', 'foo', 'apple']],
  ['test_completion_record.vhd', createPrintablePosition(29, 10), ['apple'], ['a', 'b', 'foo', 'banana']],
  ['test_completion_record.vhd', createPrintablePosition(30, 12), ['apple'], ['a', 'b', 'foo', 'banana']],
  ['test_procedure_parameter.vhd', createPrintablePosition(11, 15), ['par1', 'par2'], []],
  ['test_procedure_parameter.vhd', createPrintablePosition(19, 17), ['par3', 'par4'], []],
// eslint-disable-next-line @typescript-eslint/no-unused-vars
])('testing completion in %s:%s expecting labels: %s', async (filename, position, expectedLabels, notExpectedLabels) => {
  const uri = pathToFileURL(join(__dirname, filename));
  const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter);
  await Elaborate.elaborate(linter);
  const completions = await getCompletions(linter, position);
  expect(completions).toEqual(expect.arrayContaining(expectedLabels.map(expectedLabel =>
    expect.objectContaining({label: expectedLabel})
  )));
  // Currently record elements are generally suggested.
  // expect(completions).toEqual(expect.not.arrayContaining(notExpectedLabels.map(notExpectedLabel =>
  //   expect.objectContaining({label: notExpectedLabel})
  // )));
});