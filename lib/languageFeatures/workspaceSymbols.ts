import { SymbolInformation, SymbolKind, WorkspaceSymbolParams } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { OEntity, OInstantiation, OPackage, OProcess, OSubprogram } from '../parser/objects';
import { ProjectParser } from '../project-parser';

export async function handleOnWorkspaceSymbol(params: WorkspaceSymbolParams, projectParser: ProjectParser): Promise<SymbolInformation[] | null> {

  const symbols: SymbolInformation[] = [];
  for (const cachedFile of projectParser.cachedFiles) {
    for (const object of cachedFile.linter.file?.objectList ?? []) {
      if (object instanceof OInstantiation) {
        symbols.push(SymbolInformation.create(object.label?.text + ': ' + object.componentName, SymbolKind.Object, object.range, URI.file(cachedFile.path).toString()));
      }
      if (object instanceof OProcess) {
        symbols.push(SymbolInformation.create(object.lexerToken?.text ?? '', SymbolKind.Object, object.range, URI.file(cachedFile.path).toString()));
      }
      if (object instanceof OSubprogram) {
        symbols.push(SymbolInformation.create(object.lexerToken.text ?? '', SymbolKind.Object, object.range, URI.file(cachedFile.path).toString()));
      }
      if (object instanceof OPackage) {
        symbols.push(SymbolInformation.create(object.lexerToken.text ?? '', SymbolKind.Object, object.range, URI.file(cachedFile.path).toString()));
      }
      if (object instanceof OEntity) {
        symbols.push(SymbolInformation.create(object.lexerToken.text ?? '', SymbolKind.Object, object.range, URI.file(cachedFile.path).toString()));
      }
    }
  }
  const symbolsFiltered = symbols.filter(symbol => symbol.name.toLowerCase().indexOf(params.query.toLowerCase()) > -1);
  return symbolsFiltered;
}