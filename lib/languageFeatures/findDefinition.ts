import { DefinitionLink, Position } from "vscode-languageserver";
import { implementsIHasDefinitions } from "../parser/interfaces";
import { ORecordChild } from "../parser/objects";
import { VhdlLinter } from "../vhdl-linter";
import { findObjectFromPosition } from "./findObjectFromPosition";

export function findDefinitions(linter: VhdlLinter, position: Position): (DefinitionLink & { text: string; })[] {

  const candidates = findObjectFromPosition(linter, position);
  // Get unique definitions
  const candidateDefinitions = [...new Set(candidates.flatMap(candidate => {
    if (implementsIHasDefinitions(candidate)) {
      return candidate.definitions;
    }
    return [];
  }))];
  return candidateDefinitions.flatMap(definition => {
    const targetRange = (definition instanceof ORecordChild)
    ? definition.parent.range.copyWithNewEnd(definition.range.end).getLimitedRange(5, true)
    : definition.range.copyExtendBeginningOfLine().getLimitedRange(5);
    const targetSelectionRange = definition.lexerToken?.range ?? definition.range.copyExtendBeginningOfLine().getLimitedRange(1);
    return {
      targetRange,
      targetSelectionRange,
      text: definition.rootFile.originalText,
      targetUri: definition.rootFile.uri.toString()
    };
  });
}