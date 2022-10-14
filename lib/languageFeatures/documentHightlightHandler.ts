import { DocumentHighlight, DocumentHighlightKind, TextDocumentPositionParams } from 'vscode-languageserver';
import { initialization, linters } from '../language-server';
import { IHasLexerToken, implementsIHasLexerToken, OWrite } from '../parser/objects';

export async function documentHighlightHandler(params: TextDocumentPositionParams): Promise<DocumentHighlight[] | null> {
    await initialization;
    const linter = linters.get(params.textDocument.uri);
    if (!linter) {
        return null;
    }
    const startI = linter.getIFromPosition(params.position);
    const candidates = linter.file?.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i) ?? [];
    candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
    const candidate = candidates.filter(candidate => implementsIHasLexerToken(candidate))[0] as IHasLexerToken;
    if (typeof candidate === 'undefined') {
        return null;
    }
    const name = candidate.lexerToken.getLText();
    return (linter.file.objectList.filter(object => implementsIHasLexerToken(object) && object.lexerToken.getLText() === name) as IHasLexerToken[])
        .map(object => ({
            range: object.lexerToken.range,
            kind: object instanceof OWrite ? DocumentHighlightKind.Write : DocumentHighlightKind.Read
        }));

}