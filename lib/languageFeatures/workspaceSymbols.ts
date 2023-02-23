import { Location, SymbolInformation, SymbolKind, WorkspaceSymbolParams } from 'vscode-languageserver';
import { ProjectParser } from '../projectParser';
import { DocumentSymbols } from './documentSymbol';

export function handleOnWorkspaceSymbol(params: WorkspaceSymbolParams, projectParser: ProjectParser): SymbolInformation[] | null {

  const symbols: SymbolInformation[] = [];
  const queryLower = params.query.toLowerCase();
  for (const cachedFile of projectParser.cachedFiles) {
    symbols.push(...DocumentSymbols.get(cachedFile.linter).filter(symbol => symbol.name.toLowerCase().includes(queryLower))
      .map(documentSymbol => ({
        ...documentSymbol,
        location: Location.create(cachedFile.uri.toString(), documentSymbol.range)
      })).sort((a, b) => b.location.range.start.line - a.location.range.start.line));

  }
  return symbols;
}