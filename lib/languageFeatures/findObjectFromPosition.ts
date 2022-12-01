import { Position } from "vscode-languageserver";
import { ObjectBase } from "../parser/objects";
import { VhdlLinter } from "../vhdl-linter";

export function findObjectFromPosition(linter: VhdlLinter, position: Position): ObjectBase[] {
  const startI = linter.getIFromPosition(position);
  let candidates = linter.file?.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i) ?? [];
  for (const architecture of linter.file.architectures) {
    candidates.push(...architecture.components.filter(object => object.range.start.i <= startI && startI <= object.range.end.i));
  }
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  if (candidates.length === 0) {
    return [];
  }
  const firstRange = candidates[0].range.end.i - candidates[0].range.start.i;
  candidates = candidates.filter(c => (c.range.end.i - c.range.start.i) === firstRange);
  return candidates;
}