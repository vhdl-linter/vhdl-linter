import { ErrorCodes, Position, ResponseError, TextEdit } from 'vscode-languageserver';
import { VhdlLinter } from "../vhdlLinter";
import { findReferenceAndDefinition, getTokenFromPosition } from "./findReferencesHandler";
import { OLexerToken } from '../lexer';
import { implementsIHasLabel } from '../parser/interfaces';

function isLabel(linter: VhdlLinter, token: OLexerToken) {
  return linter.file.objectList.some(obj => implementsIHasLabel(obj) && obj.label === token);
}

export function prepareRenameHandler(linter: VhdlLinter, position: Position) {

  const token = getTokenFromPosition(linter, position);
  if (!token || token.isIdentifier() === false || isLabel(linter, token)) {
    throw new ResponseError(ErrorCodes.InvalidRequest, 'Can not rename this element',  'Can not rename this element' );
  }

  return token.range;
}
export async function renameHandler(linter: VhdlLinter, position: Position, newName: string) {
  const tokens = await findReferenceAndDefinition(linter, position);
  const changes: Record<string, TextEdit[]> = {};
  for (const token of tokens) {
    const uri = token.file.uri.toString();
    const target = changes[uri] ?? [];
    if (!Array.isArray(changes[uri])) {
      changes[uri] = target;
    }
    target.push(TextEdit.replace(token.range, newName));
  }
  return {
    changes
  };
}