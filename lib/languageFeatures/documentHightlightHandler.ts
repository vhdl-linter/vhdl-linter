import { DocumentHighlight, DocumentHighlightKind, TextDocumentPositionParams } from 'vscode-languageserver';
import { initialization, linters } from '../language-server';
import { OToken, OWrite } from '../parser/objects';

export async function documentHighlightHandler(params: TextDocumentPositionParams): Promise<DocumentHighlight[] | null> {
    await initialization;
    const linter = linters.get(params.textDocument.uri);
    if (!linter) {
        return null;
    }
    const startI = linter.getIFromPosition(params.position);
    const candidates = linter.file?.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i) ?? [];
    candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
    const candidate = candidates[0];
    if (!candidate || !(candidate instanceof OToken)) {
        return null;
    }
    return (linter.file.objectList.filter(object => object instanceof OToken && object.text.toLowerCase() === candidate.text.toLowerCase()) as OToken[])
        .map(object => ({
            range: object.range,
            kind: object instanceof OWrite ? DocumentHighlightKind.Write : DocumentHighlightKind.Read
        }));

}