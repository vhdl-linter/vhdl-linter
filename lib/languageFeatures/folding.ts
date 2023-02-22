import { FoldingRange, FoldingRangeKind } from 'vscode-languageserver';
import * as I from '../parser/interfaces';
import * as O from '../parser/objects';
import { VhdlLinter } from '../vhdlLinter';
export function foldingHandler(linter: VhdlLinter): FoldingRange[] {
  const result: FoldingRange[] = [];
  for (const obj of linter.file.objectList) {
    if (I.implementsIHasDeclarations(obj) && obj.declarationsRange !== undefined) {
      result.push(FoldingRange.create(obj.declarationsRange.start.line, obj.declarationsRange.end.line - 1));
    }
    if (I.implementsIHasStatements(obj)) {
      result.push(FoldingRange.create(obj.statementsRange.start.line, obj.statementsRange.end.line - 1));
    }
    if (obj instanceof O.OInstantiation || obj instanceof O.OAssociationList || obj instanceof O.OCaseGenerate || obj instanceof O.OCase || obj instanceof O.OConfiguration ||
      (obj instanceof O.OType && (obj.protected || obj.protectedBody || obj instanceof O.ORecord))) {
      result.push(FoldingRange.create(obj.range.start.line, obj.range.end.line));
    }
    if (I.implementsIHasUseClause(obj) && I.implementsIHasLibraries(obj)) {
      const startLine = [...obj.useClauses, ...obj.libraries].reduce((prev, curr) => Math.min(prev, curr.range.start.line), Number.POSITIVE_INFINITY);
      const endLine = [...obj.useClauses, ...obj.libraries].reduce((prev, curr) => Math.max(prev, curr.range.end.line), 0);
      if (startLine > 0 || endLine > 0) {
        result.push(FoldingRange.create(startLine, endLine, undefined, undefined, FoldingRangeKind.Imports));
      }
    }
    if (I.implementsIHasPorts(obj) && obj.portRange !== undefined) {
      result.push(FoldingRange.create(obj.portRange.start.line, obj.portRange.end.line));
    }
    if (I.implementsIHasGenerics(obj) && obj.genericRange !== undefined) {
      result.push(FoldingRange.create(obj.genericRange.start.line, obj.genericRange.end.line));
    }
  }
  return result;
}
