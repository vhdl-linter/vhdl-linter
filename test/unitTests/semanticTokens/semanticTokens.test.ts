import { afterAll, beforeAll, beforeEach, expect, jest, test } from '@jest/globals';
import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { SemanticTokensBuilder } from "vscode-languageserver";
import { Elaborate } from '../../../lib/elaborate/elaborate';
import { semanticToken, semanticTokensLegend } from '../../../lib/languageFeatures/semanticToken';
import { ProjectParser } from '../../../lib/projectParser';
import { defaultSettingsGetter } from '../../../lib/settings';
import { VhdlLinter } from '../../../lib/vhdlLinter';
import { readFileSyncNorm } from "../../readFileSyncNorm";
jest.mock('vscode-languageserver');
let projectParser: ProjectParser;
beforeAll(async () => {
  projectParser = await ProjectParser.create([pathToFileURL(__dirname)], '', defaultSettingsGetter);
});
afterAll(async () => {
  await projectParser.stop();
});
const mockSemanticTokensBuilder = jest.mocked(SemanticTokensBuilder);
beforeEach(() => {
  // Clear all instances and calls to constructor and all methods:
  mockSemanticTokensBuilder.mockClear();
});
const files = readdirSync(__dirname).filter(file => file.endsWith('.vhd'));
const maxLengthTokenTypes = semanticTokensLegend.tokenTypes.reduce((prev, curr) => Math.max(prev, curr.length), 0);
const maxLengthTokenModifiers = semanticTokensLegend.tokenModifiers.reduce((prev, curr) => Math.max(prev, curr.length), 0);
test.each(files.flatMap(file => [[file, true], [file, false]]))('testing semantic tokens for %s direction coloring %p', async (file: string, directionColoring: boolean) => {

  const path = join(__dirname, file);
  const linter = new VhdlLinter(pathToFileURL(path), readFileSyncNorm(path, { encoding: 'utf8' }),
    projectParser, defaultSettingsGetter());
  await Elaborate.elaborate(linter);
  // mock.instances is available with automatic mocks:
  semanticToken(linter, directionColoring);
  const lines = linter.text.split('\n');
  expect(mockSemanticTokensBuilder.mock.instances).toHaveLength(1);
  expect(mockSemanticTokensBuilder.mock.instances[0]?.push.mock.calls.map(([line, char, length, tokenType, tokenModifier]) => {
    const text = lines[line]?.slice(char, char + length);
    const modifiers: (string | undefined)[] = [];
    for (let index = 0; index <= semanticTokensLegend.tokenModifiers.length; index++) {
      if (tokenModifier % 2 === 1) {
        modifiers.push(semanticTokensLegend.tokenModifiers[index]);
      }
      tokenModifier = tokenModifier >> 1;
    }
    return `${line + 1}:${char + 1}`.padStart(10, ' ') + `${(semanticTokensLegend.tokenTypes[tokenType] ?? 'unknown type').padStart(maxLengthTokenTypes, ' ')} ${modifiers.map(modifier => (modifier ?? 'unknown modifier')).join(' ').padStart(maxLengthTokenModifiers, ' ') } ${text ?? 'did not find position in text'}`;
  })).toMatchSnapshot();
});
