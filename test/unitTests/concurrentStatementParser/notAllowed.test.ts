import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ProjectParser } from '../../../lib/projectParser';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../../lib/cli/readFileSyncNorm";
import { overwriteSettings } from '../../../lib/settingsUtil';

let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)]);
});
afterAll(async () => {
  await projectParser.stop();
});

const possibleStatements = {
  'block_statement': 'block_label: block begin end block;',
  'process_statement': 'process_label: process begin end process;',
  'concurrent_procedure_call_statement': 'inst_label: p;',
  'concurrent_assertion_statement': 'assert true;',
  'concurrent_signal_assignment_statement': 'a <= 5;',
  'component_instantiation_statement': 'inst_label: entity work.foo;',
  'generate_statement': 'generate_label: if true generate end generate;',
} as const;

const tests: {
  file: string;
  allowed: (keyof (typeof possibleStatements))[]
}[] = [
  {
    file: 'architecture.vhd',
    allowed: [
      'block_statement',
      'process_statement',
      'concurrent_procedure_call_statement',
      'concurrent_assertion_statement',
      'concurrent_signal_assignment_statement',
      'component_instantiation_statement',
      'generate_statement',
    ]
  },
  {
    file: 'entity.vhd',
    allowed: [
      'concurrent_assertion_statement',
      'concurrent_procedure_call_statement',
      'process_statement',
    ]
  },
];
test.each(
  tests.flatMap(test => {
    const testsForFile: [string, keyof (typeof possibleStatements), boolean][] = [];
    for (const statement of (Object.keys(possibleStatements) as (keyof (typeof possibleStatements))[])) {
      testsForFile.push([test.file, statement, test.allowed.includes(statement)]);
    }
    return testsForFile;
  })
)('Testing concurrent statement of %s with item %s (expected allowed: %s)', async (file, statement, allowed) => {
  const path = join(__dirname, file);
  const uri = pathToFileURL(path);
  const originalText = readFileSyncNorm(uri, { encoding: 'utf8' });
  const actualText = originalText.replace('!statement', possibleStatements[statement]);
  const linter = new VhdlLinter(uri, actualText, projectParser, overwriteSettings(await projectParser.getDocumentSettings(pathToFileURL(path)), {
    rules: {
      unused: false,
      "not-declared": false
    }
  }));
  const messages = await linter.checkAll();
  if (allowed) {
    expect(messages).toHaveLength(0);
  } else {
    expect(messages).toHaveLength(1);
  }
});