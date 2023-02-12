
import { expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/project-parser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdl-linter';
import { readFileSyncNorm } from "../../readFileSyncNorm";

test('testing attribute parser for declaration and specification', async () => {
  const file = 'attribute_test.vhd';
  const path = join(__dirname, file);
  const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);

  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter);
  await linter.checkAll();

  expect(linter.messages).toHaveLength(1);
  expect(linter.messages[0]?.message).toBe(`entity_name_list for attribute_specification may not be empty! (parser)`);
  await projectParser.stop();
});
test.each([
  ['attribute_test_error.vhd', `Did not find end of signature in attribute specification ']'`],
  ['attribute_test_error2.vhd', `Unexpected token unexpected in AttributeParser (was expecting 'or' or ':')`],
  ['attribute_test_error3.vhd', `type_mark expected for attribute_declaration (parser)`],
]) ('testing attribute parser with error %s %s', async (file, message) => {
    const path = join(__dirname, file);
    const projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);

    const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
      projectParser, defaultSettingsGetter);
    await linter.checkAll();

    expect(linter.messages).toHaveLength(1);
    expect(linter.messages[0]?.message).toBe(message);
    await projectParser.stop();
  });