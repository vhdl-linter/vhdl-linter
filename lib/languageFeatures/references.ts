import { Location, ReferenceParams } from 'vscode-languageserver';
import { initialization, linters } from '../language-server';
import { OToken } from '../parser/objects';

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
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  const candidate = candidates[0];
  if (!candidate) {
    return [];
  }
  if (candidate instanceof OToken) {
    return linter.file.objectList.filter(obj => obj instanceof OToken && obj.text.toLowerCase() === candidate.text.toLowerCase() && obj !== candidate).map(obj => Location.create(params.textDocument.uri, obj.range));
  }
  return [];
}