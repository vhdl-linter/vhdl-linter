import { Location, ReferenceParams } from 'vscode-languageserver';
import { initialization, linters } from '../language-server';
import { OReference } from '../parser/objects';

export async function handleReferences (params: ReferenceParams): Promise<Location[]> {
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
  candidates.sort((a, b) => a.range.length.lines === b.range.length.line ? a.range.length.characters - b.range.length.characters : a.range.length.lines - b.range.length.lines);
  const candidate = candidates[0];
  if (!candidate) {
    return [];
  }
  if (candidate instanceof OReference) {
    return linter.file.objectList.filter(obj => obj instanceof OReference && obj.referenceToken.getLText() === candidate.referenceToken.getLText() && obj !== candidate).map(obj => Location.create(params.textDocument.uri, obj.range));
  }
  return [];
}