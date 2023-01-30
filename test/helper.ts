import { Range } from "vscode-languageserver";

export function makeRangePrintable(range: Range) {
  return `${range.start.line + 1}:${range.start.character + 1} - ${range.end.line + 1}:${range.end.character + 1}`;
}
export function createPrintableRange(startLine: number, startCharacter: number, endLine: number, endCharacter: number) {
  return {
    start: {
      line: startLine - 1,
      character: startCharacter - 1
    },
    end: {
      line: endLine - 1,
      character: endCharacter - 1
    },
    toString: function () {
      return makeRangePrintable(this);
    }
  };
}