import { expect, test } from '@jest/globals';
import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import path = require("path");
import oniguruma = require('vscode-oniguruma');
import vsctm = require('vscode-textmate');
import { readFileSyncNorm } from '../../readFileSyncNorm';

const wasmBin = readFileSync(path.join(__dirname, './../../../node_modules/vscode-oniguruma/release/onig.wasm')).buffer;
const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
  return {
    createOnigScanner(patterns: string[]) { return new oniguruma.OnigScanner(patterns); },
    createOnigString(s: string) { return new oniguruma.OnigString(s); }
  };
});

// Create a registry that can create a grammar from a scope name.
const registry = new vsctm.Registry({
  onigLib: vscodeOnigurumaLib,
  loadGrammar: async (scopeName: string) => {
    if (scopeName === 'source.vhdl') {
      const file = await readFile(__dirname + '/../../../syntaxes/vhdl-new.json', { encoding: 'utf-8' });
      return vsctm.parseRawGrammar(file, '.json');
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
  let ruleStack = vsctm.INITIAL;
  const tokens = text.map(line => {
    const lineTokens = grammar.tokenizeLine(line, ruleStack);
    ruleStack = lineTokens.ruleStack;
    return lineTokens.tokens;
  });
  expect(tokens).toMatchSnapshot();
  // for (const line of text) {
  //   console.log(`\nTokenizing line: ${line}`);
  //   for (const token of lineTokens.tokens) {
  //     console.log(` - token from ${token.startIndex} to ${token.endIndex} ` +
  //       `(${line.substring(token.startIndex, token.endIndex)}) ` +
  //       `with scopes ${token.scopes.join(', ')}`
  //     );
  //   }
  // }
});