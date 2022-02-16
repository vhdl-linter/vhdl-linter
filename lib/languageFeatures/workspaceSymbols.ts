import { SymbolInformation, SymbolKind, WorkspaceSymbolParams } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { projectParser } from '../language-server';
import { OEntity, OInstantiation, OPackage, OProcess, OSubprogram } from '../parser/objects';

export async function handleOnWorkspaceSymbol(params: WorkspaceSymbolParams): Promise<SymbolInformation[] | null> {

  const symbols: SymbolInformation[] = [];
  for (const cachedFile of projectParser.cachedFiles) {
    for (const object of cachedFile.linter.tree?.objectList ?? []) {
      if (object instanceof OInstantiation) {
        symbols.push(SymbolInformation.create(object.label + ': ' + object.componentName, SymbolKind.Object, object.range, URI.file(cachedFile.path).toString()));
      }
      if (object instanceof OProcess) {
        symbols.push(SymbolInformation.create(object.label ?? '', SymbolKind.Object, object.range, URI.file(cachedFile.path).toString()));
      }
      if (object instanceof OSubprogram) {
        symbols.push(SymbolInformation.create(object.name.text ?? '', SymbolKind.Object, object.range, URI.file(cachedFile.path).toString()));
      }
      if (object instanceof OPackage) {
        symbols.push(SymbolInformation.create(object.name.text ?? '', SymbolKind.Object, object.range, URI.file(cachedFile.path).toString()));
      }
      if (object instanceof OEntity) {
        symbols.push(SymbolInformation.create(object.name.text ?? '', SymbolKind.Object, object.range, URI.file(cachedFile.path).toString()));
      }
    }
  }
  const symbolsFiltered = symbols.filter(symbol => symbol.name.toLowerCase().indexOf(params.query.toLowerCase()) > -1);
  return symbolsFiltered;
}