import { exec, spawn } from 'child_process';
import { promises } from 'fs';
import { tmpdir } from 'os';
import { sep } from 'path';
import { platform } from 'process';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { CancellationToken, DocumentFormattingParams, LSPErrorCodes, Range, ResponseError, TextEdit, WorkDoneProgressReporter } from 'vscode-languageserver';
import { attachWorkDone } from 'vscode-languageserver/lib/common/progress';
import { connection, documents } from '../language-server';
import { getRootDirectory, joinURL } from '../project-parser';
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
const nullProgressReporter = attachWorkDone(undefined as any, /* params */ undefined);
async function _getProgressReporter(reporter: WorkDoneProgressReporter, title: string) {
  // This is a bit ugly, but we need to determine whether the provided reporter
  // is an actual client-side progress reporter or a dummy (null) progress reporter
  // created by the LSP library. If it's the latter, we'll create a server-initiated
  // progress reporter.
  if (reporter.constructor !== nullProgressReporter.constructor) {
    return reporter;
  }

  const serverInitiatedReporter = await connection.window.createWorkDoneProgress();
  serverInitiatedReporter.begin(
    title
  );

  return serverInitiatedReporter;
}
const execP = promisify(exec);
export async function handleDocumentFormatting(params: DocumentFormattingParams, token: CancellationToken, workDoneProgress: WorkDoneProgressReporter): Promise<TextEdit[] | null | ResponseError> {
  const document = documents.get(params.textDocument.uri);
  if (typeof document === 'undefined') {
    return null;
  }
  const text = document.getText();
  const path = await promises.mkdtemp(tmpdir() + sep);
  const tmpFile = path + sep + 'beautify';
  await promises.writeFile(tmpFile, text);
  const rootDir = getRootDirectory();
  const emacsScripts = joinURL(rootDir, 'emacs', 'emacs-vhdl-formatting-script.lisp');
  const emacsLoadPath = joinURL(rootDir, 'emacs');
  const numSpaces = typeof params.options.tabSize === 'number' ? params.options.tabSize : 2;
  let foundEmacs = false;
  if (platform === 'win32') {
    try {
      await execP(`emacs --batch`);
      foundEmacs = true;
    } catch (e) {
    }
  } else {
    try {
      await execP(`command -v emacs`);
      foundEmacs = true;
    } catch (e) {
    }
  }
  if (!foundEmacs) {
    connection.window.showErrorMessage('vhdl-linter is using emacs for formatting. Install emacs for formatting to work.');
    return null;

  }
  const controller = new AbortController();
  const { signal } = controller;
  token.onCancellationRequested(() => {
    controller.abort();
  });
  const progress = await _getProgressReporter(workDoneProgress, 'Emacs Formatter running');

  if (platform === 'win32') {
    progress.report(0, "Emacs Formatter running");

    const cmd = `emacs --batch --eval "(setq-default vhdl-basic-offset ${numSpaces})" ` +
      // The vhdl-mode from the folder does not work with win for some reason
      // `--eval "(setq load-path (cons (expand-file-name \\"${fileURLToPath(emacsLoadPath)}\\") load-path))" ` +
      ` -l ${fileURLToPath(emacsScripts)} -f vhdl-batch-indent-region ${tmpFile}`
    try {
      await execP(cmd);
    } catch (e) {
      progress.done();

      if (e.name === "AbortError") {
        return new ResponseError(LSPErrorCodes.RequestCancelled, 'canceled');
      }
      throw e;
    }
    progress.done();

  } else {
    try {
      await new Promise<void>((resolve, reject) => {
        const args = ['-c', `emacs --batch --eval "(setq-default vhdl-basic-offset ${numSpaces})" ` +
          `--eval "(setq load-path (cons (expand-file-name \\"${fileURLToPath(emacsLoadPath)}\\") load-path))" ` +
          ` -l ${fileURLToPath(emacsScripts)} -f vhdl-batch-indent-region ${tmpFile}`];
        const emacs = spawn('sh', args, { signal });

        emacs.stderr.on('data', (data: Buffer) => {
          const match = data.toString().match(/(\d+)%/) as [string, string] | null;
          if (match) {
            progress.report(parseInt(match[1]), data.toString());
          }
        });
        emacs.on('error', err => reject(err));
        emacs.on('close', code => {
          if (code === 0) {
            resolve();
          }
          reject(code);
        });
      });

      progress.done();
    } catch (e) {
      progress.done();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (e.name === "AbortError") {
        return new ResponseError(LSPErrorCodes.RequestCancelled, 'canceled');
      }
      throw e;
    }
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