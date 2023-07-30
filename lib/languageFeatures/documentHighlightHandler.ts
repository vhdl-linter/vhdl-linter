import { DocumentHighlight, DocumentHighlightKind, TextDocumentPositionParams } from 'vscode-languageserver';
import { OLexerToken } from '../lexer';
import { IHasLexerToken, IHasNameToken, implementsIHasLexerToken, implementsIHasNameToken } from '../parser/interfaces';
import { ObjectBase, OName } from '../objects/objectsIndex';
import { VhdlLinter } from '../vhdlLinter';
import { findObjectFromPosition } from './findObjects';

export function documentHighlightHandler(linter: VhdlLinter, params: TextDocumentPositionParams): DocumentHighlight[] {
  const startI = linter.getIFromPosition(params.position);

  const candidates = findObjectFromPosition(linter, params.position)
    .filter(candidate => {
      // Only use Objects that have a lexer Token (either directly or as a reference Token)
      // Also check if the cursor is actually in that token itself, or just in that objects range.
      if (implementsIHasLexerToken(candidate)) {
        if (candidate.lexerToken.range.start.i <= startI && startI <= candidate.lexerToken.range.end.i) {
          return true;
        }
      } else if (implementsIHasNameToken(candidate)) {
        if (candidate.nameToken.range.start.i <= startI && startI <= candidate.nameToken.range.end.i) {
          return true;
        }
      }
      return false;

    }) as (ObjectBase & (IHasLexerToken | IHasNameToken))[];

  if (candidates.length === 0) {
    return [];
  }
  const candidate = candidates[0];
  const highlights: DocumentHighlight[] = [];

  const searchForToken = (token: OLexerToken) => {
    const name = token.getLText();
    for (const object of linter.file.objectList) {
      if (implementsIHasLexerToken(object) && object.lexerToken.getLText() === name) {
        highlights.push({
          range: object.lexerToken.range,
          kind: DocumentHighlightKind.Read
        });
      } else if (implementsIHasNameToken(object) && object.nameToken.getLText() === name) {
        highlights.push({
          range: object.nameToken.range,
          kind: object instanceof OName && object.write ? DocumentHighlightKind.Write : DocumentHighlightKind.Read
        });
      }
    }
  };
  if (candidate) {
    if (implementsIHasLexerToken(candidate)) {
      searchForToken(candidate.lexerToken);
    }
    if (implementsIHasNameToken(candidate)) {
      searchForToken(candidate.nameToken);
    }
  }
  return highlights;

}