import { Position } from 'vscode';
import { Location } from 'vscode-languageserver';
import { OReference } from '../parser/objects';
import { VhdlLinter } from '../vhdl-linter';

export function handleReferences (linter: VhdlLinter, position: Position): Location[] {

  const startI = linter.getIFromPosition(position);
  const candidates = linter.file.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i);
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  const candidate = candidates[0];
  if (!candidate) {
    return [];
  }
  if (candidate instanceof OReference) {
    return linter.file.objectList.filter(obj => obj instanceof OReference && obj.referenceToken.getLText() === candidate.referenceToken.getLText() && obj !== candidate).map(obj => Location.create(linter.file.uri.toString(), obj.range));
  }
  return [];
}