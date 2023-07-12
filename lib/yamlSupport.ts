/**
 * https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/main/src/desktop/yaml_support.ts
MIT License

Copyright (c) 2020-present GitLab B.V.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
import * as vscode from 'vscode';
import { matchGlobList, settingsGlob } from './projectParser';
const DO_NOT_SHOW_YAML_SUGGESTION = 'DO_NOT_SHOW_YAML_SUGGESTION';

export const setupYamlSupport = (context: vscode.ExtensionContext) => {
  if (vscode.extensions.getExtension('redhat.vscode-yaml')) { return; }
  if (context.globalState.get(DO_NOT_SHOW_YAML_SUGGESTION) === true) { return; }
  vscode.workspace.onDidOpenTextDocument(async document => {
    if (context.globalState.get(DO_NOT_SHOW_YAML_SUGGESTION) === true) { return; }
    if (matchGlobList(document.fileName, [settingsGlob])) {
      const choice = await vscode.window.showInformationMessage(
        "Would you like to install Red Hat's YAML extension to get real-time linting on the vhdl-linter.yml file?",
        'Yes',
        'Not now',
        "No. Don't ask again.",
      );
      if (choice === 'Yes') {
        await vscode.commands.executeCommand(
          'workbench.extensions.installExtension',
          'redhat.vscode-yaml',
        );
      } else if (choice === "No. Don't ask again.") {
        await context.globalState.update(DO_NOT_SHOW_YAML_SUGGESTION, true);
      }
    }
  });
};
