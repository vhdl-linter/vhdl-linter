import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../../lib/projectParser';
import { defaultSettingsGetter } from '../../../../lib/settings';
import { VhdlLinter } from '../../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../../readFileSyncNorm";

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(join(__dirname, 'projectParser'))], '', defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});

const possibleDeclarations = {
  'subprogram_declaration': 'procedure x;',
  // 'subprogram_instantiation_declaration': '', // TODO: implement subprogram instantiation declarations (4.4)
  'use_clause': 'use ieee.std_logic_1164.all;',
  // 'package_declaration': 'package p is end;', // TODO: implement package declarations in declarative part
  'package_instantiation_declaration': 'package inst_pkg is new work.generic_pkg generic map (par => 10);',
  'type_declaration': 'type e is (apple, banana);',
  'subtype_declaration': 'subtype x is integer range 0 to 1;',
  'constant_declaration': 'constant x: integer := 5;',
  'signal_declaration': 'signal s: integer;',
  'variable_declaration': 'variable v: integer;',
  'file_declaration': 'file f: intFile;',
  'alias_declaration': 'alias std_bit is std.standard.bit;',
  'component_declaration': 'component xyz end component;',
  'attribute_declaration': 'attribute attr: string;',
  'attribute_specification': 'procedure p; attribute attr of p: procedure is "stuff";',
  // 'disconnection_specification': '',
  // 'group_template_declaration': '',
  // 'group_declaration': '',
} as const;

const tests: {
  file: string;
  allowed: (keyof (typeof possibleDeclarations))[]
}[] = [
    {
      file: 'protected.vhd',
      allowed: [
        'subprogram_declaration',
        // 'subprogram_instantiation_declaration',
        'use_clause',
        'attribute_specification',
      ]
    },
    {
      file: 'package.vhd',
      allowed: [
        'subprogram_declaration',
        // 'subprogram_instantiation_declaration',
        'use_clause',
        // 'package_declaration',
        'package_instantiation_declaration',
        'type_declaration',
        'subtype_declaration',
        'constant_declaration',
        'signal_declaration',
        'variable_declaration',
        'file_declaration',
        'alias_declaration',
        'component_declaration',
        'attribute_declaration',
        'attribute_specification',
        // 'disconnection_specification',
        // 'group_template_declaration',
        // 'group_declaration',
      ]
    },
  ];

test.each(
  tests.flatMap(test => {
    const testsForFile: [string, keyof (typeof possibleDeclarations), boolean][] = [];
    for (const declaration of (Object.keys(possibleDeclarations) as (keyof (typeof possibleDeclarations))[])) {
      testsForFile.push([test.file, declaration, test.allowed.includes(declaration)]);
    }
    return testsForFile;
  })
)('Testing declarative part of %s with item %s (expected allowed: %s)', async (file, declaration, allowed) => {
  const path = join(__dirname, file);
  const uri = pathToFileURL(path);
  const originalText = readFileSyncNorm(uri, { encoding: 'utf8' });
  const actualText = originalText.replace('!declaration', possibleDeclarations[declaration]);
  const linter = new VhdlLinter(uri, actualText, projectParser, defaultSettingsGetter);
  const messages = await linter.checkAll();
  if (allowed) {
    expect(messages).toHaveLength(0);
  } else {
    expect(messages).toHaveLength(1);
  }
});