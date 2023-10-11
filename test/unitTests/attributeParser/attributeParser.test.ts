
import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { OAttributeName } from '../../../lib/parser/objects';
import { ProjectParser } from '../../../lib/projectParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../../lib/cli/readFileSyncNorm";
import { CancellationTokenSource } from 'vscode-languageserver';


let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
});
afterAll(async () => {
  await projectParser.stop();
});

test('testing attribute parser for declaration and specification', async () => {
  const file = 'attribute_test.vhd';
  const path = join(__dirname, file);

  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, await projectParser.getDocumentSettings(pathToFileURL(path)));
  await linter.checkAll();

  expect(linter.messages).toHaveLength(1);
  expect(linter.messages[0]?.message).toBe(`entity_name_list for attribute_specification may not be empty! (parser)`);
});
test.each([
  ['attribute_test_error.vhd', `Did not find end of signature in attribute specification ']'`],
  ['attribute_test_error2.vhd', `Unexpected token unexpected in AttributeParser (was expecting 'of' or ':')`],
  ['attribute_test_error3.vhd', `type_mark expected for attribute_declaration (parser)`],
  ['attribute_test_error5.vhd', `Unexpected token unexpected in AttributeParser (was expecting 'of' or ':')`],
])('testing attribute parser with error %s %s', async (file, message) => {
  const path = join(__dirname, file);

  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, await projectParser.getDocumentSettings(pathToFileURL(path)));
  await linter.checkAll();

  expect(linter.messages).toHaveLength(1);
  expect(linter.messages[0]?.message).toBe(message);
});
test('testing attribute_test_error4.vhd', async () => {
  const file = 'attribute_test_error4.vhd';
  const path = join(__dirname, file);

  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, await projectParser.getDocumentSettings(pathToFileURL(path)));
  await linter.checkAll();

  expect(linter.messages).toHaveLength(2);
  expect(linter.messages[0]?.message).toBe(`Unexpected ; in attribute_specification. Assuming forgotten ':'`);
  expect(linter.messages[1]?.message).toBe(`expected entity, architecture, configuration, procedure, function, package, type, subtype, constant, signal, variable, component, label, literal, units, group, file, property, sequence found ';'`);
});
test('attribute_test_error6.vhd', async () => {
  const file = 'attribute_test_error6.vhd';
  const path = join(__dirname, file);

  const uri = pathToFileURL(path);
  const linter = new VhdlLinter(uri, readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, await projectParser.getDocumentSettings(pathToFileURL(path)));
  await linter.checkAll();

  expect(linter.messages).toHaveLength(1);
  expect(linter.messages[0]?.message).toBe(`Unexpected signal in attribute_specification. Assuming forgotten ':' (parser)`);
  const solution = linter.diagnosticCodeActionRegistry[parseInt((String(linter.messages[0]?.code ?? '',).split(';') as [string, ...string[]])[0])]?.(uri.toString(), new CancellationTokenSource().token);
  expect(solution).toEqual(expect.arrayContaining([
    {
      edit: {
        changes: {
          [uri.toString()]: [expect.objectContaining({
            newText: ':',
            range: expect.objectContaining({
              start: expect.objectContaining({
                line: 12,
                character: 25
              }),
              end: expect.objectContaining({
                line: 12,
                character: 25
              })
            }),
          })]
        },
      },
      title: `Insert ':'`,
      kind: 'quickfix'
    }
  ]));
});
test('attribute_prefix.vhd', async () => {
  const file = 'attribute_prefix.vhd';
  const path = join(__dirname, file);

  const uri = pathToFileURL(path);
  const linter = new VhdlLinter(uri, readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, await projectParser.getDocumentSettings(pathToFileURL(path)));
  await linter.checkAll();
  for (const obj of linter.file.objectList) {
    if (obj instanceof OAttributeName) {
      expect(obj.prefix).toBeDefined();
    }
  }
});