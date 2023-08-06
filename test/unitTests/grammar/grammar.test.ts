import { beforeAll, expect, test } from '@jest/globals';
import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import { readFileSyncNorm } from '../../../lib/cli/readFileSyncNorm';
import path = require("path");
import oniguruma = require('vscode-oniguruma');
import vscodeTextmate = require('vscode-textmate');

const wasmBin = readFileSync(path.join(__dirname, './../../../node_modules/vscode-oniguruma/release/onig.wasm')).buffer;
const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
  return {
    createOnigScanner(patterns: string[]) { return new oniguruma.OnigScanner(patterns); },
    createOnigString(s: string) { return new oniguruma.OnigString(s); }
  };
});
let grammar: vscodeTextmate.IGrammar;
beforeAll(async () => {
  const _grammar = await registry.loadGrammar('source.vhdl');
  if (_grammar === null) {
    throw new Error();
  }
  grammar = _grammar;
});
// Create a registry that can create a grammar from a scope name.
const registry = new vscodeTextmate.Registry({
  onigLib: vscodeOnigurumaLib,
  loadGrammar: async (scopeName: string) => {
    if (scopeName === 'source.vhdl') {
      const file = await readFile(__dirname + '/../../../syntaxes/vhdl.json', { encoding: 'utf-8' });
      return vscodeTextmate.parseRawGrammar(file, '.json');
    }
    console.log(`Unknown scope name: ${scopeName}`);
    return null;
  }
});
function tokenizeLines(lines: string[]) {
  let ruleStack = vscodeTextmate.INITIAL;

  const tokens = lines.map(line => {
    const lineTokens = grammar.tokenizeLine(line, ruleStack);
    ruleStack = lineTokens.ruleStack;
    return lineTokens.tokens.map(token => ({
      ...token,
      text: line.slice(token.startIndex, token.endIndex).toLowerCase()
    }));
  });
  return tokens;
}
test.each([
  `test_protected.vhd`,
  'test_literals.vhd'
])('grammar test on %s', (filename: string) => {

  const text = readFileSyncNorm(__dirname + `/${filename}`, { encoding: 'utf-8' }).split('\n');
  const tokens = tokenizeLines(text);
  expect(tokens).toMatchSnapshot();
  // verify case insensitivity
  const textUppercase = text.map(line => line.toUpperCase());
  const tokensUppercase = tokenizeLines(textUppercase);
  expect(tokensUppercase).toStrictEqual(tokens);

  const textLowercase = text.map(line => line.toUpperCase());
  const tokensLowercase = tokenizeLines(textLowercase);
  expect(tokensLowercase).toStrictEqual(tokens);
  let i = 0;
  const textMixedCase = text.map(line => {
    let newLine = '';
    for (const char of line) {
      newLine += (i++) % 2 === 1 ? char.toLowerCase() : char.toUpperCase();
    }
    return newLine;
  });
  const tokensMixedCase = tokenizeLines(textMixedCase);

  expect(tokensMixedCase).toStrictEqual(tokens);
});