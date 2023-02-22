import { FoldingRange, FoldingRangeKind } from 'vscode-languageserver';
import { implementsIHasLibraries, implementsIHasUseClause } from '../parser/interfaces';
import { OArchitecture, OAssociationList, OCase, OComponent, OElseClause, OEntity, OForGenerate, OIfClause, OIfGenerateClause, OInstantiation, OPackage, OPackageBody, OProcess, ORecord, OStatementBody, OSubprogram, OType, OWhenClause } from '../parser/objects';
import { VhdlLinter } from '../vhdlLinter';
export function foldingHandler(linter: VhdlLinter): FoldingRange[] {
  const result: FoldingRange[] = [];
  for (const obj of linter.file.objectList) {
    if (obj instanceof OStatementBody && obj.endOfDeclarativePart) {
      // Find the last non whitespace character in Declarative Part
      let tokenIndex = linter.file.lexerTokens.findIndex(token => token.range.start.i <= obj.endOfDeclarativePart!.i && token.range.end.i > obj.endOfDeclarativePart!.i);
      do {
        tokenIndex--;
      } while ((linter.file.lexerTokens[tokenIndex]?.isWhitespace()));
      result.push(FoldingRange.create(obj.range.start.line, linter.file.lexerTokens[tokenIndex]!.range.end.line));
      result.push(FoldingRange.create(obj.endOfDeclarativePart.line, obj.range.end.line));

    } else if (obj instanceof OProcess || obj instanceof OIfClause || obj instanceof OInstantiation || obj instanceof OIfGenerateClause || obj instanceof OForGenerate ||
      obj instanceof OAssociationList || obj instanceof OEntity || obj instanceof OArchitecture || obj instanceof OElseClause || obj instanceof OCase || obj instanceof OWhenClause || obj instanceof OSubprogram ||
      obj instanceof OCase || obj instanceof OComponent || obj instanceof OPackage || obj instanceof OPackageBody ||
      obj instanceof OStatementBody || (obj instanceof OType && (obj.protected || obj.protectedBody || obj instanceof ORecord))) {
      result.push(FoldingRange.create(obj.range.start.line, obj.range.end.line));
    }
    if (implementsIHasUseClause(obj) && implementsIHasLibraries(obj)) {
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
