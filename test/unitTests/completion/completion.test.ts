import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { Completions } from '../../../lib/languageFeatures/completion';
import { ProjectParser } from '../../../lib/projectParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { createPrintablePosition } from '../../helper';
import { readFileSyncNorm } from "../../../lib/cli/readFileSyncNorm";
import { overwriteSettings } from '../../../lib/settingsUtil';
let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
});
afterAll(async () => {
  await projectParser.stop();
});

test.each([
  ['lowercase', 'std_ulogic_vector', 'STD_ULOGIC_VECTOR'],
  ['UPPERCASE', 'STD_ULOGIC_VECTOR', 'std_ulogic_vector']
])('testing completion %s shall contain %s shall not contain %s', async (ieeeCasing, shallContain, shallNotContain) => {
  const uri = pathToFileURL(join(__dirname, 'test_completion.vhd'));
  const settings = overwriteSettings(await projectParser.getDocumentSettings(uri), {
    style:
    {
      ieeeCasing: ieeeCasing as 'lowercase' | 'UPPERCASE'
    }
  });
  const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }),
    projectParser, settings);
  await Elaborate.elaborate(linter);
  const completion = new Completions(linter).getCompletions({ line: 9, character: 13 });
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
  ['test_completion.vhd', createPrintablePosition(17, 18), ['u_unsigned'], []],
  ['test_completion.vhd', createPrintablePosition(21, 11), ['test_port'], []],
  ['test_completion.vhd', createPrintablePosition(23, 1), ['all', 'procedure'], []],
  ['test_completion.vhd', createPrintablePosition(24, 6), ['banana'], []],
  ['test_completion.vhd', createPrintablePosition(24, 12), ['peach'], []],
  ['test_completion_record.vhd', createPrintablePosition(25, 10), ['foo'], ['a', 'b', 'banana', 'apple']],
  ['test_completion_record.vhd', createPrintablePosition(26, 11), ['foo'], ['a', 'b', 'banana', 'apple']],
  ['test_completion_record.vhd', createPrintablePosition(27, 14), ['banana'], ['a', 'b', 'foo', 'apple']],
  ['test_completion_record.vhd', createPrintablePosition(28, 15), ['banana'], ['a', 'b', 'foo', 'apple']],
  ['test_completion_record.vhd', createPrintablePosition(29, 10), ['apple'], ['a', 'b', 'foo', 'banana']],
  ['test_completion_record.vhd', createPrintablePosition(30, 12), ['apple'], ['a', 'b', 'foo', 'banana']],
  ['test_procedure_parameter.vhd', createPrintablePosition(11, 15), ['par1', 'par2'], []],
  ['test_procedure_parameter.vhd', createPrintablePosition(19, 17), ['par3', 'par4'], []],
])('testing completion in %s:%s expecting labels: %s', async (filename, position, expectedLabels, notExpectedLabels) => {
  const uri = pathToFileURL(join(__dirname, filename));
  const linter = new VhdlLinter(uri, readFileSyncNorm(uri, { encoding: 'utf8' }),
    projectParser, await projectParser.getDocumentSettings(uri));
  await Elaborate.elaborate(linter);
  const completions = new Completions(linter).getCompletions(position);
  expect(completions).toEqual(expect.arrayContaining(expectedLabels.map(expectedLabel =>
    expect.objectContaining({ label: expectedLabel })
  )));
  if (notExpectedLabels.length > 0) {
    expect(completions).toEqual(expect.not.arrayContaining(notExpectedLabels.map(notExpectedLabel =>
      expect.objectContaining({label: notExpectedLabel})
    )));
  }
});