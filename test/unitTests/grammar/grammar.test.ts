import { expect, test } from '@jest/globals';
import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import path = require("path");
import oniguruma = require('vscode-oniguruma');
import vscodeTextmate = require('vscode-textmate');
import { readFileSyncNorm } from '../../readFileSyncNorm';

const wasmBin = readFileSync(path.join(__dirname, './../../../node_modules/vscode-oniguruma/release/onig.wasm')).buffer;
const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
  return {
    createOnigScanner(patterns: string[]) { return new oniguruma.OnigScanner(patterns); },
    createOnigString(s: string) { return new oniguruma.OnigString(s); }
  };
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

test('grammar test', async () => {
  const grammar = await registry.loadGrammar('source.vhdl');
  if (grammar === null) {
    return;
  }
  const text =  readFileSyncNorm(__dirname + `/test_protected.vhd`, {encoding: 'utf-8'}).split('\n');
  let ruleStack = vscodeTextmate.INITIAL;
  const tokens = text.map(line => {
    const lineTokens = grammar.tokenizeLine(line, ruleStack);
    ruleStack = lineTokens.ruleStack;
    return lineTokens.tokens;
  });
  expect(tokens).toMatchSnapshot();
});