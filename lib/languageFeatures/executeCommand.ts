import { ExecuteCommandParams, TextEdit } from 'vscode-languageserver';
import { connection, documents, initialization, linters } from '../language-server';

export async function handleExecuteCommand(params: ExecuteCommandParams) {
  await initialization;
  if (!params.arguments) {
    return;
  }
  console.log(params);
  const textDocumentUri = params.arguments[0];
  const linter = linters.get(textDocumentUri);
  if (typeof linter === 'undefined') {
    return;
  }
  const callback = linter.commandCallbackRegistry[parseInt(params.arguments[1], 10)];
  const edits: TextEdit[] = [];
  if (typeof callback === 'function') {
    edits.push(...callback(textDocumentUri));
  }
  const document = documents.get(textDocumentUri);
  if (!document) {
    return;
  }
  await connection.workspace.applyEdit({
    edit: {
      changes: {
        [textDocumentUri]: edits
      }
    }
  });
}