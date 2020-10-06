import { WorkspaceSymbolParams, Connection, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { projectParser } from '../language-server';
import { OInstantiation, OProcess, OFunction, OPackage, OEntity } from '../parser/objects';

export async function handleOnWorkspaceSymbol(params: WorkspaceSymbolParams): Promise<SymbolInformation[] | null> {

  const symbols: SymbolInformation[] = [];
  for (const cachedFile of projectParser.cachedFiles) {
    for (const object of cachedFile.linter.tree?.objectList ?? []) {
      if (object instanceof OInstantiation) {
        symbols.push(SymbolInformation.create(object.label + ': ' + object.componentName, SymbolKind.Object, object.range, `file://${cachedFile.path}`));
      }
      if (object instanceof OProcess) {
        symbols.push(SymbolInformation.create(object.label ?? '', SymbolKind.Object, object.range, `file://${cachedFile.path}`));
      }
      if (object instanceof OFunction) {
        symbols.push(SymbolInformation.create(object.name.text ?? '', SymbolKind.Object, object.range, `file://${cachedFile.path}`));
      }
      if (object instanceof OPackage) {
        symbols.push(SymbolInformation.create(object.name ?? '', SymbolKind.Object, object.range, `file://${cachedFile.path}`));
      }
      if (object instanceof OEntity) {
        symbols.push(SymbolInformation.create(object.name ?? '', SymbolKind.Object, object.range, `file://${cachedFile.path}`));
      }
    }
  }
  const symbolsFiltered = symbols.filter(symbol => symbol.name.toLowerCase().indexOf(params.query.toLowerCase()) > -1);
  return symbolsFiltered;
}