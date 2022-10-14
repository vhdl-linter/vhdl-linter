import { DocumentHighlight, DocumentHighlightKind, TextDocumentPositionParams } from 'vscode-languageserver';
import { initialization, linters } from '../language-server';
import { IHasName, implementsIHasName, OWrite } from '../parser/objects';

export async function documentHighlightHandler(params: TextDocumentPositionParams): Promise<DocumentHighlight[] | null> {
    await initialization;
    const linter = linters.get(params.textDocument.uri);
    if (!linter) {
        return null;
    }
    const startI = linter.getIFromPosition(params.position);
    const candidates = linter.file?.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i) ?? [];
    candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
    const candidate = candidates.filter(candidate => implementsIHasName(candidate))[0] as IHasName;
    if (typeof candidate === 'undefined') {
        return null;
    }
    const name = candidate.name.text.toLowerCase();
    return (linter.file.objectList.filter(object => implementsIHasName(object) && object.name.text.toLowerCase() === name) as IHasName[])
        .map(object => ({
            range: object.name.range,
            kind: object instanceof OWrite ? DocumentHighlightKind.Write : DocumentHighlightKind.Read
        }));

}