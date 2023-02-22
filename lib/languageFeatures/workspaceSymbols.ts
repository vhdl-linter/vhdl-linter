import { SymbolInformation, SymbolKind, WorkspaceSymbolParams } from 'vscode-languageserver';
import { OEntity, OInstantiation, OPackage, OProcess, OSubprogram } from '../parser/objects';
import { ProjectParser } from '../projectParser';

export function handleOnWorkspaceSymbol(params: WorkspaceSymbolParams, projectParser: ProjectParser): SymbolInformation[] | null {

  const symbols: SymbolInformation[] = [];
  for (const cachedFile of projectParser.cachedFiles) {
    for (const object of cachedFile.linter.file.objectList) {
      if (object instanceof OInstantiation) {
        symbols.push(SymbolInformation.create(`${object.label?.text ?? ''}: ${object.componentName.text}`, SymbolKind.Object, object.range, cachedFile.uri.toString()));
      }
      if (object instanceof OProcess) {
        symbols.push(SymbolInformation.create(object.lexerToken?.text ?? '', SymbolKind.Object, object.range, cachedFile.uri.toString()));
      }
      if (object instanceof OSubprogram) {
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
  return symbolsFiltered;
}