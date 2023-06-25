import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../../lib/projectParser';
import { defaultSettingsGetter, defaultSettingsWithOverwrite } from '../../../../lib/settings';
import { VhdlLinter } from '../../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../../readFileSyncNorm";

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(join(__dirname, 'projectParser'))], defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});

const possibleDeclarations = {
  'subprogram_declaration': 'procedure x;',
  'subprogram_body': 'procedure x is begin end;',
  // 'subprogram_instantiation_declaration': '', // TODO: implement subprogram instantiation declarations (4.4)
  'use_clause': 'use work.util.all;',
  'package_declaration': 'package p is end;',
  'package_body': 'package body p is end;',
  'package_instantiation_declaration': 'package inst_pkg is new work.generic_pkg generic map (par => 10);',
  'type_declaration': 'type e is (apple, banana);',
  'subtype_declaration': 'subtype x is integer range 0 to 1;',
  'constant_declaration': 'constant x: integer := 5;',
  'signal_declaration': 'signal s: integer;',
  'variable_declaration': 'variable v: integer;',
  'shared_variable_declaration': 'shared variable v: pType;',
  'file_declaration': 'file f: intFile;',
  'alias_declaration': 'alias std_bit is std.standard.bit;',
  'component_declaration': 'component xyz end component;',
  'attribute_declaration': 'attribute attr: string;',
  'attribute_specification': (filename: string) => {
    if (filename === 'configuration_declaration.vhd') {
      return 'attribute attr of conf: configuration is "stuff";';
    }
    return 'procedure p; attribute attr of p: procedure is "stuff";';
  },
  'configuration_specification': 'for component_specification ;',
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
      'package_declaration',
      'package_instantiation_declaration',
      'type_declaration',
      'subtype_declaration',
      'constant_declaration',
      'signal_declaration',
      'variable_declaration',
      'shared_variable_declaration',
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
  {
    file: 'entity.vhd',
    allowed: [
      'subprogram_declaration',
      'subprogram_body',
      // 'subprogram_instantiation_declaration',
      'package_declaration',
      'package_body',
      'package_instantiation_declaration',
      'type_declaration',
      'subtype_declaration',
      'constant_declaration',
      'signal_declaration',
      'shared_variable_declaration',
      'file_declaration',
      'alias_declaration',
      'attribute_declaration',
      'attribute_specification',
      'use_clause',
      // 'disconnection_specification',
      // 'group_template_declaration',
      // 'group_declaration',
    ]
  },
  {
    file: 'package_body.vhd',
    allowed: [
      'subprogram_declaration',
      'subprogram_body',
      // 'subprogram_instantiation_declaration',
      'package_declaration',
      'package_body',
      'package_instantiation_declaration',
      'type_declaration',
      'subtype_declaration',
      'constant_declaration',
      'variable_declaration',
      'shared_variable_declaration',
      'file_declaration',
      'alias_declaration',
      'attribute_declaration',
      'attribute_specification',
      'use_clause',
      // 'group_template_declaration',
      // 'group_declaration',
    ]
  },
  {
    file: 'architecture.vhd', // is the same as block, generate
    allowed: [
      'subprogram_declaration',
      'subprogram_body',
      // 'subprogram_instantiation_declaration',
      'package_declaration',
      'package_body',
      'package_instantiation_declaration',
      'type_declaration',
      'subtype_declaration',
      'constant_declaration',
      'signal_declaration',
      'shared_variable_declaration',
      'file_declaration',
      'alias_declaration',
      'component_declaration',
      'attribute_declaration',
      'attribute_specification',
      'configuration_specification',
      // 'disconnection_specification',
      'use_clause',
      // 'group_template_declaration',
      // 'group_declaration',
    ]
  },
  {
    file: 'process.vhd',
    allowed: [
      'subprogram_declaration',
      'subprogram_body',
      // 'subprogram_instantiation_declaration',
      'package_declaration',
      'package_body',
      'package_instantiation_declaration',
      'type_declaration',
      'subtype_declaration',
      'constant_declaration',
      'variable_declaration',
      'file_declaration',
      'alias_declaration',
      'attribute_declaration',
      'attribute_specification',
      'use_clause',
      // 'group_template_declaration',
      // 'group_declaration',
    ]
  },
  {
    file: 'protected_body.vhd',
    allowed: [
      'subprogram_declaration',
      'subprogram_body',
      // 'subprogram_instantiation_declaration',
      'package_declaration',
      'package_body',
      'package_instantiation_declaration',
      'type_declaration',
      'subtype_declaration',
      'constant_declaration',
      'variable_declaration',
      'file_declaration',
      'alias_declaration',
      'attribute_declaration',
      'attribute_specification',
      'use_clause',
      // 'group_template_declaration',
      // 'group_declaration',
    ]
  },
  {
    file: 'subprogram.vhd',
    allowed: [
      'subprogram_declaration',
      'subprogram_body',
      // 'subprogram_instantiation_declaration',
      'package_declaration',
      'package_body',
      'package_instantiation_declaration',
      'type_declaration',
      'subtype_declaration',
      'constant_declaration',
      'variable_declaration',
      'file_declaration',
      'alias_declaration',
      'attribute_declaration',
      'attribute_specification',
      'use_clause',
      // 'group_template_declaration',
      // 'group_declaration',
    ]
  },
  {
    file: 'configuration_declaration.vhd',
    allowed: [
      'use_clause',
      'attribute_specification',
      // 'group_declaration'
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
  const declarationEntry = possibleDeclarations[declaration];
  const declarationCode = typeof declarationEntry === 'function' ? declarationEntry(file) : declarationEntry;
  const actualText = originalText.replace('!declaration', declarationCode);
  const linter = new VhdlLinter(uri, actualText, projectParser, defaultSettingsWithOverwrite({
    rules: {
      unused: false
    }
  })());
  const messages = await linter.checkAll();
  if (file === 'configuration_declaration.vhd' && declaration === 'configuration_specification') {
    // Declarative part parser can not distinguish between configuration specification and the configuration within the declaration.
    // Therefore this error can not be detected.
    expect(messages).toHaveLength(0);
  } else {
    if (allowed) {
      expect(messages).toHaveLength(0);
    } else {
      expect(messages).toHaveLength(1);
    }

  }
});