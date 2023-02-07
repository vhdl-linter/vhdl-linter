import { ErrorCodes, Position, ResponseError, TextEdit } from 'vscode-languageserver';
import { VhdlLinter } from "../vhdl-linter";
import { findReferenceAndDefinition, getTokenFromPosition } from "./findReferencesHandler";

export function prepareRenameHandler(linter: VhdlLinter, position: Position) {

  const token = getTokenFromPosition(linter, position);
  if (!token || token.isIdentifier() === false) {
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