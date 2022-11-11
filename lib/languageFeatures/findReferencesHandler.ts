import { ErrorCodes, Location, Position, ReferenceParams, RenameParams, ResponseError, TextDocumentIdentifier, TextDocumentPositionParams, TextEdit } from 'vscode-languageserver';
import { initialization, linters, lintersValid } from '../language-server';
import { OLexerToken } from '../lexer';
import { implementsIReferencable, ObjectBase, OReference, implementsIHasLexerToken } from '../parser/objects';

export async function findReferences(params: { textDocument: TextDocumentIdentifier, position: Position }) {
  await initialization;
  const linter = linters.get(params.textDocument.uri);
  if (typeof linter === 'undefined') {
    return [];
  }
  if (typeof linter.file === 'undefined') {
    return [];
  }
  const startI = linter.getIFromPosition(params.position);
  const candidates = linter.file.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i);
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  let candidate = candidates[0];
  if (!candidate) {
    return [];
  }
  if (candidate instanceof OLexerToken && candidate.parent instanceof ObjectBase) {
    candidate = candidate.parent;
  }
  // debugger;
  if (candidate instanceof OReference && candidate.definitions) {
    return candidate.definitions.concat(candidate.definitions.flatMap(c => {
      return implementsIReferencable(c) ? c.references : [];
    }));
  }
  if (implementsIReferencable(candidate)) {
    return ([candidate] as ObjectBase[]).concat(candidate.references ?? []);
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
  if (typeof linter.file === 'undefined') {
    throw new ResponseError(ErrorCodes.InvalidRequest, 'Parser not ready', 'Parser not ready');
  }
  const startI = linter.getIFromPosition(params.position);
  const candidates = linter.file.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i);
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  const candidate = candidates[0];
  if (!candidate) {
    throw new ResponseError(ErrorCodes.InvalidRequest, 'Can not rename this element', 'Can not rename this element');
  }
  if (implementsIHasLexerToken(candidate)) {
    return candidate.lexerToken.range;
  }
  return candidate.range;
}
export async function renameHandler(params: RenameParams) {
  const references = (await findReferences(params)).map(reference => {
    if (implementsIHasLexerToken(reference)) {
      return reference.lexerToken;
    }
    return reference;
  }).filter((r, i, s) => s.indexOf(r) === i);
  return {
    changes: {
      [params.textDocument.uri]: references.map(reference => TextEdit.replace(reference.range, params.newName))
    }
  };
}