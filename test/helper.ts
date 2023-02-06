import { Position } from "vscode";
import { Range } from "vscode-languageserver";

export function makeRangePrintable(range: Range) {
  return `${range.start.line + 1}:${range.start.character + 1} - ${range.end.line + 1}:${range.end.character + 1}`;
}
export function makePositionPrintable(position: Position) {
  return `${position.line + 1}:${position.character + 1}`;
}
export function createPrintableRange(line: number, startCharacter: number, endCharacter: number) {
  return {
    start: {
      line: line - 1,
      character: startCharacter - 1
    },
    end: {
      line: line - 1,
      character: endCharacter - 1
    },
    toString: function () {
      return makeRangePrintable(this);
    }
  };
}
// Expects line and character with with one indexed numbers (for easy copying from editor)
export function createPrintablePosition(onesLine: number, onesCharacter: number) {
  return {
    line: onesLine - 1,
    character: onesCharacter - 1,
    toString: function () {
      return makePositionPrintable(this);
    }
  };
}