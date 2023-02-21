import { FoldingRange, FoldingRangeKind } from 'vscode-languageserver';
import * as I from '../parser/interfaces';
import * as O from '../parser/objects';
import { VhdlLinter } from '../vhdlLinter';
export function foldingHandler(linter: VhdlLinter): FoldingRange[] {
  const result: FoldingRange[] = [];
  for (const obj of linter.file.objectList) {
    if (I.implementsIHasDeclarations(obj)) {
      result.push(FoldingRange.create(obj.declarationsRange.start.line, obj.declarationsRange.end.line - 1));
    }
    if (I.implementsIHasStatements(obj) && obj.statements.length > 0) {
      const statementsStart = (I.implementsIHasDeclarations(obj)) ? obj.declarationsRange.end.line : (obj.statements.map(dec => dec.range.start).sort((a, b) => a.i - b.i)[0]!.line - 1);
      const statementsEnd = obj.statements.map(dec => dec.range.end).sort((a, b) => b.i - a.i)[0]!.line;
      result.push(FoldingRange.create(statementsStart, statementsEnd));
    }
    if (obj instanceof O.OInstantiation || obj instanceof O.OAssociationList || obj instanceof O.OComponent || obj instanceof O.OCaseGenerate ||
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
  }
  for (const entity of linter.file.entities) {
    if (entity !== undefined) {
      if (entity.portRange) {
        result.push(FoldingRange.create(entity.portRange.start.line, entity.portRange.end.line));
      }
      if (entity.genericRange) {
        result.push(FoldingRange.create(entity.genericRange.start.line, entity.genericRange.end.line));
      }
    }
  }
  return result;
}
