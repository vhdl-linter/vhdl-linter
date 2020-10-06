import { exec } from 'child_process';
import { promises } from 'fs';
import { tmpdir } from 'os';
import { sep } from 'path';
import { promisify } from 'util';
import { DocumentFormattingParams, Range, TextEdit } from 'vscode-languageserver';
import { documents } from '../language-server';

export async function handleDocumentFormatting (params: DocumentFormattingParams): Promise<TextEdit[] | null> {
  const document = documents.get(params.textDocument.uri);
  if (typeof document === 'undefined') {
    return null;
  }
  const text = document.getText();
  const path = await promises.mkdtemp(tmpdir() + sep);
  const tmpFile = path + sep + 'beautify';
  await promises.writeFile(tmpFile, text);
  const emacs_script_path = __dirname + '/../../emacs-vhdl-formating-script.lisp';
  await promisify(exec)(`emacs --batch -l ${emacs_script_path} -f vhdl-batch-indent-region ${tmpFile}`);
  return [{
    range: Range.create(document.positionAt(0), document.positionAt(text.length)),
    newText: await promises.readFile(tmpFile, { encoding: 'utf8' })
  }];
}