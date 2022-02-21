import { CodeLensParams } from 'vscode-languageserver';
import { initialization, linters } from '../language-server';

export async function handleCodeLens (params: CodeLensParams) {
  await initialization;
  const linter = linters.get(params.textDocument.uri);
  if (typeof linter === 'undefined') {
    return [];
  }
  if (typeof linter.file === 'undefined') {
    return [];
  }
  return linter.getCodeLens(params.textDocument.uri);
}