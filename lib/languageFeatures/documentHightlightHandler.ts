import { DocumentHighlight, DocumentHighlightKind, TextDocumentPositionParams } from 'vscode-languageserver';
import { initialization, linters } from '../language-server';
import { IHasLexerToken, IHasReferenceToken, implementsIHasLexerToken, implementsIHasReferenceToken, ObjectBase, OWrite } from '../parser/objects';
import { VhdlLinter } from '../vhdl-linter';
import { findObjectFromPosition } from './findObjectFromPosition';

export function documentHighlightHandler(linter: VhdlLinter, params: TextDocumentPositionParams): DocumentHighlight[]  {
    const startI = linter.getIFromPosition(params.position);

    const candidates = findObjectFromPosition(linter, params.position)
        .filter(candidate => {
            // Only use Objects that have a lexer Token (either directly or as a reference Token)
            // Also check if the cursor is actually in that token itself, or just in that objects range.
            if (implementsIHasLexerToken(candidate)) {
                if (candidate.lexerToken.range.start.i <= startI && startI <= candidate.lexerToken.range.end.i) {
                    return true;
                }
            } else if (implementsIHasReferenceToken(candidate)) {
                if (candidate.referenceToken.range.start.i <= startI && startI <= candidate.referenceToken.range.end.i) {
                    return true;
                }
            }
            return false;

        }) as (ObjectBase & (IHasLexerToken | IHasReferenceToken))[]

    const candidate = candidates[0];
    if (candidate === undefined) {
        return [];
    }
    const highlights: DocumentHighlight[] = [];
    if (implementsIHasLexerToken(candidate)) {
        const name = candidate.lexerToken.getLText();
        for (const object of linter.file.objectList) {
            if (implementsIHasLexerToken(object) && object.lexerToken.getLText() === name) {
                highlights.push({
                    range: object.lexerToken.range,
                    kind: object instanceof OWrite ? DocumentHighlightKind.Write : DocumentHighlightKind.Read
                });
            } else if (implementsIHasReferenceToken(object) && object.referenceToken.getLText() === name) {
                highlights.push({
                    range: object.referenceToken.range,
                    kind: object instanceof OWrite ? DocumentHighlightKind.Write : DocumentHighlightKind.Read
                });
            }
        }

    }
    if (implementsIHasReferenceToken(candidate)) {
        const name = candidate.referenceToken.getLText();
        for (const object of linter.file.objectList) {
            if (implementsIHasLexerToken(object) && object.lexerToken.getLText() === name) {
                highlights.push({
                    range: object.lexerToken.range,
                    kind: object instanceof OWrite ? DocumentHighlightKind.Write : DocumentHighlightKind.Read
                });
            } else if (implementsIHasReferenceToken(object) && object.referenceToken.getLText() === name) {
                highlights.push({
                    range: object.referenceToken.range,
                    kind: object instanceof OWrite ? DocumentHighlightKind.Write : DocumentHighlightKind.Read
                });
            }
        }

    }
    return highlights;

}