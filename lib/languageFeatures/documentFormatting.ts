import { exec } from 'child_process';
import { promises } from 'fs';
import { tmpdir } from 'os';
import { sep } from 'path';
import { promisify } from 'util';
import { DocumentFormattingParams, Range, TextEdit } from 'vscode-languageserver';
import { documents } from '../language-server';

export async function handleDocumentFormatting(params: DocumentFormattingParams): Promise<TextEdit[] | null> {
  const document = documents.get(params.textDocument.uri);
  if (typeof document === 'undefined') {
    return null;
  }
  const text = document.getText();
  const path = await promises.mkdtemp(tmpdir() + sep);
  const tmpFile = path + sep + 'beautify';
  await promises.writeFile(tmpFile, text);
  const emacs_script_path = __dirname + '/../../../emacs-vhdl-formating-script.lisp';
  const numSpaces = typeof params.options.tabSize === 'number' ? params.options.tabSize : 2;
  await promisify(exec)(`emacs --batch --eval "(setq-default vhdl-basic-offset ${numSpaces})" -l ${emacs_script_path}   -f vhdl-batch-indent-region ${tmpFile}`);
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