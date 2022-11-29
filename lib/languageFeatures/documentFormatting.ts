import { exec } from 'child_process';
import { promises } from 'fs';
import { tmpdir } from 'os';
import { join, sep } from 'path';
import { promisify } from 'util';
import { DocumentFormattingParams, Range, ResponseError, TextEdit } from 'vscode-languageserver';
import { documents } from '../language-server';
import { getRootDirectory } from '../project-parser';

export async function handleDocumentFormatting(params: DocumentFormattingParams): Promise<TextEdit[] | null> {
  const document = documents.get(params.textDocument.uri);
  if (typeof document === 'undefined') {
    return null;
  }
  const text = document.getText();
  const path = await promises.mkdtemp(tmpdir() + sep);
  const tmpFile = path + sep + 'beautify';
  await promises.writeFile(tmpFile, text);
  const rootDir = getRootDirectory();
  const emacsScripts = join(rootDir, 'emacs-vhdl-formating-script.lisp');
  const emacsLoadPath = join(rootDir, 'emacs');
  const numSpaces = typeof params.options.tabSize === 'number' ? params.options.tabSize : 2;
  try {
    await promisify(exec)(`emacs --batch --eval "(setq-default vhdl-basic-offset ${numSpaces})" --eval "(setq load-path (cons (expand-file-name \\"${emacsLoadPath}\\") load-path))" -l ${emacsScripts} -f vhdl-batch-indent-region ${tmpFile}`);
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
  } catch (e) {
    throw new ResponseError(-1, 'Install emacs for formatting to work.');
  }
}