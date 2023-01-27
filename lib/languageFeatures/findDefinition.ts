import { DefinitionLink, Position } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { implementsIHasDefinitions } from "../parser/interfaces";
import { VhdlLinter } from "../vhdl-linter";
import { findObjectFromPosition } from "./findObjectFromPosition";

export async function findDefinitions(linter: VhdlLinter, position: Position): Promise<(DefinitionLink & { text: string; })[]> {

  const candidates = findObjectFromPosition(linter, position);
  return candidates.flatMap(candidate => {
    if (implementsIHasDefinitions(candidate) && candidate.definitions) {
      return candidate.definitions.map(definition => {
        return {
          targetRange: definition.range.copyExtendBeginningOfLine().getLimitedRange(10),
          targetSelectionRange: definition.lexerToken?.range ?? definition.range.copyExtendBeginningOfLine().getLimitedRange(1),
          text: definition.rootFile.originalText,
          targetUri: URI.file(definition.rootFile.file).toString()
        };
      });
    } else {
      return [];
    }
  });
}