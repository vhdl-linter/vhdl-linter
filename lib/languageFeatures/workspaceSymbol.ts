import { fileURLToPath } from 'url';
import { SymbolInformation, SymbolKind, WorkspaceSymbolParams } from 'vscode-languageserver';
import { OProcess, OSubprogram, OPackage, OEntity, OType, ORecordChild } from '../parser/objects';
import { ProjectParser } from '../projectParser';

export function workspaceSymbol(params: WorkspaceSymbolParams, projectParser: ProjectParser, additionPaths: string[]): SymbolInformation[] | null {
  const start = Date.now();
  const symbols: SymbolInformation[] = [];
  for (const cachedFile of projectParser.cachedFiles) {
    if (cachedFile.builtIn || additionPaths.find(additionalPath => fileURLToPath(cachedFile.uri).startsWith(additionalPath))) {
      continue;
    }
    for (const object of cachedFile.linter.file.objectList) {
      if (object instanceof OProcess && object.label) {
        symbols.push(SymbolInformation.create(object.label.text , SymbolKind.Object, object.range, cachedFile.uri.toString()));
      }
      if (object instanceof OSubprogram) {
        symbols.push(SymbolInformation.create(object.lexerToken.text, SymbolKind.Object, object.range, cachedFile.uri.toString()));
      }
      if (object instanceof OType && object instanceof ORecordChild === false) {
        symbols.push(SymbolInformation.create(object.lexerToken.text, SymbolKind.Object, object.range, cachedFile.uri.toString()));
      }
      if (object instanceof OPackage) {
        symbols.push(SymbolInformation.create(object.lexerToken.text, SymbolKind.Object, object.range, cachedFile.uri.toString()));
      }
      if (object instanceof OEntity) {
        symbols.push(SymbolInformation.create(object.lexerToken.text, SymbolKind.Object, object.range, cachedFile.uri.toString()));
      }
    }
  }
  const symbolsFiltered = symbols.filter(symbol => symbol.name.toLowerCase().includes(params.query.toLowerCase()));
  console.log('Workspace Symbol ', Date.now() - start);
  return symbolsFiltered;
}