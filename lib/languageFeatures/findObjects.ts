import { Position } from "vscode-languageserver";
import { OLexerToken } from "../lexer";
import * as I from "../parser/interfaces";
import * as O from "../parser/objects";
import { VhdlLinter } from "../vhdlLinter";
import { SetAdd } from "./findReferencesHandler";

export function findObjectFromPosition(linter: VhdlLinter, position: Position): O.ObjectBase[] {
  const startI = linter.getIFromPosition(position);
  let candidates = (linter.file.objectList.filter(object => object.range.start.i <= startI + 1 && startI <= object.range.end.i) ?? [])
    // If the association has no formal part its range is identical to the included reference.
    // But we prefer to get the reference so explicity exclude Association here. (#197)
    .filter(candidate => candidate instanceof O.OAssociation === false);
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  const firstCandidate = candidates[0];
  if (!firstCandidate) {
    return [];
  }
  const firstRange = firstCandidate.range.end.i - firstCandidate.range.start.i;
  candidates = candidates.filter(c => (c.range.end.i - c.range.start.i) === firstRange);
  return candidates;
}

export function findObjectByDesignator(linter: VhdlLinter, token: OLexerToken): O.ObjectBase[] {
  const foundObjects = new SetAdd<O.ObjectBase>();
  // find all possible definitions for the lexerToken
  for (const obj of linter.file.objectList) {
    if (obj instanceof O.OReference && obj.referenceToken === token) {
      if (obj.parent instanceof O.OUseClause) {
        foundObjects.add(obj.parent);
      } else {
        foundObjects.add(obj);
      }
    }
    if (I.implementsIHasLabel(obj) && (obj.label.getLText() === token.getLText() || obj.endingLabel?.getLText() === token.getLText())) {
      foundObjects.add(obj);
    }
    if (obj instanceof O.OInstantiation) {
      if (obj.entityName === token) {
        foundObjects.add(obj);
      }
    }
    if (I.implementsIHasLexerToken(obj) && obj.lexerToken === token) {
      foundObjects.add(obj);
    }
    if (I.implementsIHasEndingLexerToken(obj) && obj.endingLexerToken === token) {
      foundObjects.add(obj);
    }
    if (obj instanceof O.OComponent && obj.endingReferenceToken === token) {
      foundObjects.add(obj);
    }

    if (obj instanceof O.OArchitecture && obj.entityName === token) {
      foundObjects.add(obj);
    }
    if (obj instanceof O.OConfiguration && obj.entityName === token) {
      foundObjects.add(obj);
    }
  }
  return [...foundObjects];
}