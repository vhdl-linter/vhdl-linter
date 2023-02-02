import { Range } from "vscode-languageserver";

export function makeRangePrintable(range: Range) {
  return `${range.start.line + 1}:${range.start.character + 1} - ${range.end.line + 1}:${range.end.character + 1}`;
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