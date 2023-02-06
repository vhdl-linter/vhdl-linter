import { Position } from "vscode-languageserver";
import { OAssociation, ObjectBase } from "../parser/objects";
import { VhdlLinter } from "../vhdl-linter";

export function findObjectFromPosition(linter: VhdlLinter, position: Position): ObjectBase[] {
  const startI = linter.getIFromPosition(position);
  let candidates = (linter.file.objectList.filter(object => object.range.start.i <= startI + 1 && startI <= object.range.end.i) ?? [])
  // If the association has no formal part its range is identical to the included reference.
  // But we prefer to get the reference so explicity exclude Association here. (#197)
    .filter(candidate => candidate instanceof OAssociation === false);
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  const firstCandidate = candidates[0];
  if (!firstCandidate) {
    return [];
  }
  const firstRange = firstCandidate.range.end.i - firstCandidate.range.start.i;
  candidates = candidates.filter(c => (c.range.end.i - c.range.start.i) === firstRange);
  return candidates;
}