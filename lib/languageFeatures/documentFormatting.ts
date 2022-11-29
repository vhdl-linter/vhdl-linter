import { exec } from 'child_process';
import { promises } from 'fs';
import { tmpdir } from 'os';
import { join, sep } from 'path';
import { promisify } from 'util';
import { CancellationToken, DocumentFormattingParams, LSPErrorCodes, Range, ResponseError, TextEdit } from 'vscode-languageserver';
import { connection, documents } from '../language-server';
import { getRootDirectory } from '../project-parser';

export async function handleDocumentFormatting(params: DocumentFormattingParams, token: CancellationToken): Promise<TextEdit[] | null | ResponseError> {
  const document = documents.get(params.textDocument.uri);
  if (typeof document === 'undefined') {
    return null;
  }
  const text = document.getText();
  const path = await promises.mkdtemp(tmpdir() + sep);
  const tmpFile = path + sep + 'beautify';
  await promises.writeFile(tmpFile, text);
  const rootDir = getRootDirectory();
  const emacsScripts = join(rootDir, 'emacs', 'emacs-vhdl-formating-script.lisp');
  const emacsLoadPath = join(rootDir, 'emacs');
  const numSpaces = typeof params.options.tabSize === 'number' ? params.options.tabSize : 2;
  try {
    await promisify(exec)(`command -v emacs`);
  } catch (e) {
    connection.window.showErrorMessage('vhdl-linter is using emacs for formatting. Install emacs for formatting to work.');
  }
  const controller = new AbortController();
  const { signal } = controller;
  token.onCancellationRequested(() => {
    controller.abort();
  })
  try {
    await promisify(exec)(`emacs --batch --eval "(setq-default vhdl-basic-offset ${numSpaces})" ` +
      `--eval "(setq load-path (cons (expand-file-name \\"${emacsLoadPath}\\") load-path))" ` +
      `--eval "(setq-default vhdl-standard '(08 nil))"` +
      ` -l ${emacsScripts} -f vhdl-batch-indent-region ${tmpFile}`, { signal });
  } catch (e) {
    if (e.name === "AbortError") {
      return new ResponseError(LSPErrorCodes.RequestCancelled, 'canceled');
    }
    throw e;
  }
  // Emacs VHDL mode hard tabs seem to be broken.
  // Replace spaces in beginning with tabs
  let newText = await promises.readFile(tmpFile, { encoding: 'utf8' });
  if (params.options.insertSpaces === false) {
    const re = /^( +)/gm;
    console.log(re);
    newText = newText.replaceAll(re,
      match => '\t'.repeat(Math.ceil(match.length / numSpaces))
    );
  }
  return [{
    range: Range.create(document.positionAt(0), document.positionAt(text.length)),
    newText
  }];
}