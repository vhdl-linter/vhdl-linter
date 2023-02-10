import { Position } from "vscode-languageserver";
import { OAssociationList, OFile, OInstantiation } from "../../parser/objects";
import { VhdlLinter } from "../../vhdl-linter";
import { findObjectFromPosition } from "../findObjects";

export function findParentInstantiation(linter: VhdlLinter, position: Position): [OInstantiation, OAssociationList | undefined] | undefined {
  const object = findObjectFromPosition(linter, position)[0];
  if (object === undefined) {
    return undefined;
  }
  let iterator = object;
  let associationList: OAssociationList | undefined;
  // Find Parent that is defined by a subprogram (instantiation)
  while (iterator instanceof OFile === false) {
    if (iterator instanceof OAssociationList) {
      associationList = iterator;
    }
    if (iterator instanceof OInstantiation) {
      return [iterator, associationList];
    }

    if (iterator.parent instanceof OFile) {
      break;
    }
    iterator = iterator.parent;
  }
  return undefined;
}
