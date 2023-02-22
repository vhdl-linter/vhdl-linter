import { Position } from "vscode-languageserver";
import { OLexerToken } from "../lexer";
import { implementsIHasEndingLexerToken, implementsIHasLexerToken } from "../parser/interfaces";
import { OArchitecture, OAssociation, ObjectBase, OComponent, OConfiguration, OInstantiation, OReference, OUseClause } from "../parser/objects";
import { VhdlLinter } from "../vhdlLinter";
import { SetAdd } from "./findReferencesHandler";

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

export function findObjectByDesignator(linter: VhdlLinter, token: OLexerToken): ObjectBase[] {
  // TODO: also find label designators
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
    if (obj instanceof OComponent && obj.endingReferenceToken === token) {
      foundObjects.add(obj);
    }

    if (obj instanceof OArchitecture && obj.entityName === token) {
      foundObjects.add(obj);
    }
    if (obj instanceof OConfiguration && obj.entityName === token) {
      foundObjects.add(obj);
    }
  }
  return [...foundObjects];
}