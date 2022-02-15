import { ReferenceParams, Location, TextDocumentPositionParams, RenameParams, ResponseError, ErrorCodes, TextDocumentIdentifier, Position, WorkspaceEdit, TextEdit } from 'vscode-languageserver';
import { initialization, linters, lintersValid } from '../language-server';
import { OToken, OName, ObjectBase, implementsIMentionable } from '../parser/objects';

export async function findReferences(params: { textDocument: TextDocumentIdentifier, position: Position }) {
  await initialization;
  const linter = linters.get(params.textDocument.uri);
  if (typeof linter === 'undefined') {
    return [];
  }
  if (typeof linter.tree === 'undefined') {
    return [];
  }
  let startI = linter.getIFromPosition(params.position);
  const candidates = linter.tree.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i);
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  let candidate = candidates[0];
  if (!candidate) {
    return [];
  }
  if (candidate instanceof OName && candidate.parent instanceof ObjectBase) {
    candidate = candidate.parent;
  }
  // debugger;
  if (candidate instanceof OToken && candidate.definition) {
    candidate = candidate.definition;
  }
  if (implementsIMentionable(candidate)) {
    return ([candidate] as ObjectBase[]).concat(candidate.mentions ?? []);
  }
  return [];
}
export async function findReferencesHandler(params: ReferenceParams, ) {

  return (await findReferences(params)).map(object => Location.create(params.textDocument.uri, object.range));
}
export async function prepareRenameHandler(params: TextDocumentPositionParams) {
  await initialization;
  const linter = linters.get(params.textDocument.uri);
  if (lintersValid.get(params.textDocument.uri) !== true) {
    throw new ResponseError(ErrorCodes.InvalidRequest, 'Document not valid. Renaming only supported for parsable documents.', 'Document not valid. Renaming only supported for parsable documents.');
  }
  if (typeof linter === 'undefined') {
    throw new ResponseError(ErrorCodes.InvalidRequest, 'Parser not ready', 'Parser not ready');
  }
  if (typeof linter.tree === 'undefined') {
    throw new ResponseError(ErrorCodes.InvalidRequest, 'Parser not ready', 'Parser not ready');
  }
  let startI = linter.getIFromPosition(params.position);
  const candidates = linter.tree.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i);
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  const candidate = candidates[0];
  if (!candidate) {
    throw new ResponseError(ErrorCodes.InvalidRequest, 'Can not rename this element', 'Can not rename this element');
  }
  return candidate.range;
}
export async function renameHandler(params: RenameParams) {
  const references = (await findReferences(params)).map(reference => {
    if (implementsIMentionable(reference)) {
      return reference.name;
    }
    return reference;
  });
  console.log(references.map(reference => `${reference.range.start.line} ${reference.range.start.character}`));
  return {
    changes: {
      [params.textDocument.uri]: references.map(reference => TextEdit.replace(reference.range, params.newName))
    }
  };
}