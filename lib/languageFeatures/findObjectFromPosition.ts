import { Position } from "vscode-languageserver";
import { implementsIHasEndingLexerToken, implementsIHasLexerToken } from "../parser/interfaces";
import { OArchitecture, ObjectBase, OInstantiation, OReference, OUseClause } from "../parser/objects";
import { VhdlLinter } from "../vhdl-linter";
import { getTokenFromPosition, SetAdd } from "./findReferencesHandler";

export function findObjectFromPosition(linter: VhdlLinter, position: Position): ObjectBase[] {
  const token = getTokenFromPosition(linter, position);
  if (!token) {
    return [];
  }

  const foundObjects = new SetAdd<ObjectBase>();
  // find all possible definitions for the lexerToken
  for (const obj of linter.file.objectList) {
    if (obj instanceof OReference && obj.referenceToken === token) {
      if (obj.parent instanceof OUseClause) {
        foundObjects.add(obj.parent);
      } else {
        foundObjects.add(obj);
      }
    }
    if (obj instanceof OInstantiation) {
      if (obj.componentName === token) {
        foundObjects.add(obj);
      }
    }
    if (implementsIHasLexerToken(obj) && obj.lexerToken === token) {
      foundObjects.add(obj);
    }
    if (implementsIHasEndingLexerToken(obj) && obj.endingLexerToken === token) {
      foundObjects.add(obj);
    }

    if (obj instanceof OArchitecture && obj.entityName === token) {
      foundObjects.add(obj);
    }
  }
  return [...foundObjects];
}