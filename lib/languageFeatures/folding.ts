import { FoldingRange } from 'vscode-languageserver';
import { OArchitecture, OAssociationList, OCase, OComponent, OElseClause, OEntity, OForGenerate, OIfClause, OIfGenerateClause, OInstantiation, OPackage, OPackageBody, OProcess, OSubprogram, OWhenClause } from '../parser/objects';
import { VhdlLinter } from '../vhdl-linter';
export function foldingHandler (linter: VhdlLinter): FoldingRange[] {
  const result: FoldingRange[] = [];
  for (const obj of linter.file.objectList) {
    if (obj instanceof OProcess || obj instanceof OIfClause || obj instanceof OInstantiation || obj instanceof OIfGenerateClause || obj instanceof OForGenerate ||
      obj instanceof OAssociationList || obj instanceof OEntity || obj instanceof OArchitecture || obj instanceof OElseClause || obj instanceof OCase || obj instanceof OWhenClause || obj instanceof OSubprogram ||
      obj instanceof OCase || obj instanceof OComponent || obj instanceof OPackage || obj instanceof OPackageBody) {
      result.push(FoldingRange.create(obj.range.start.line, obj.range.end.line));
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
