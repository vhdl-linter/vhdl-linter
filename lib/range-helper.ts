import { Range } from "vscode-languageserver";

export function rangeContains(innerRange: Range, outerRange: Range) {
  if (innerRange.start.line < outerRange.start.line || (innerRange.start.line === outerRange.start.line && innerRange.start.character < outerRange.start.character)) {
    return false;
  }
  if (innerRange.end.line > outerRange.end.line || (innerRange.end.line === outerRange.end.line && innerRange.end.character > outerRange.end.character)) {
    return false;
  }
  return true;
}