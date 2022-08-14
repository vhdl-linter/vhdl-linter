import { text } from 'blessed';
import {
  CodeAction, createConnection, DidChangeConfigurationNotification, ErrorCodes, Hover, InitializeParams, IPCMessageReader, IPCMessageWriter, Position, ProposedFeatures, TextDocument, TextDocuments
} from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { handleCodeLens } from './languageFeatures/codeLens';
import { handleCompletion } from './languageFeatures/completion';
import { handleDocumentFormatting } from './languageFeatures/documentFormatting';
import { documentHighlightHandler } from './languageFeatures/documentHightlightHandler';
import { handleOnDocumentSymbol } from './languageFeatures/documentSymbol';
import { handleExecuteCommand } from './languageFeatures/executeCommand';
import { findReferencesHandler, prepareRenameHandler, renameHandler } from './languageFeatures/findReferencesHandler';
import { foldingHandler } from './languageFeatures/folding';
import { handleReferences } from './languageFeatures/references';
import { handleOnWorkspaceSymbol } from './languageFeatures/workspaceSymbols';
import { implementsIHasDefinitions, OFile, OInstantiation, OName, OMagicCommentDisable, OComponent, OUseClause } from './parser/objects';
import { ProjectParser } from './project-parser';
import { VhdlLinter } from './vhdl-linter';
import { window } from 'vscode';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
export const connection = createConnection(ProposedFeatures.all, new IPCMessageReader(process), new IPCMessageWriter(process));


// Create a simple text document manager. The text document manager
// supports full document sync only
export const documents: TextDocuments = new TextDocuments();

let hasWorkspaceFolderCapability: boolean = false;
// let hasDiagnosticRelatedInformationCapability: boolean = false;
export let projectParser: ProjectParser;
let rootUri: string | undefined;
export interface ISettings {
  ports: {
    outRegex: string;
    inRegex: string;
    enablePortStyle: boolean;
  };
  paths: {
    additional: string[];
    ignoreRegex: string;
  };
  style: {
    preferedLogicType: 'std_logic' | 'std_ulogic';
    unusedSignalRegex: string;
  };
  rules: {
    warnLibrary: boolean;
    warnLogicType: boolean;
    warnMultipleDriver: boolean;
  };
}
const defaultSettings: ISettings = {
  ports: {
    outRegex: '^o_',
    inRegex: '^i_',
    enablePortStyle: true,
  },
  paths: {
    additional: [],
    ignoreRegex: ''
  },
  style: {
    preferedLogicType: 'std_ulogic',
    unusedSignalRegex: '_unused$'
  },
  rules: {
    warnLogicType: true,
    warnLibrary: true,
    warnMultipleDriver: false
  }
};
let globalSettings: ISettings = defaultSettings;
let hasConfigurationCapability: boolean = false;
// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ISettings>> = new Map();
connection.onDidChangeConfiguration(change => {

  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <ISettings>(
      (change.settings.VhdlLinter || defaultSettings)
    );
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});
export function getDocumentSettings(resource: string): Thenable<ISettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'VhdlLinter'
    });
    documentSettings.set(resource, result);
  }
  return result;
}
connection.onInitialize((params: InitializeParams) => {
  let capabilities = params.capabilities;
  hasWorkspaceFolderCapability =
    capabilities.workspace && !!capabilities.workspace.workspaceFolders || false;
  if (params.rootUri) {
    rootUri = params.rootUri;
  }
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      codeActionProvider: true,
      // Tell the client that the server supports code completion
      completionProvider: {
        resolveProvider: false
      },

      documentSymbolProvider: true,
      definitionProvider: true,
      hoverProvider: true,
      documentFormattingProvider: true,
      referencesProvider: true,
      foldingRangeProvider: true,
      documentHighlightProvider: true,
      executeCommandProvider: { commands: ['vhdl-linter:lsp-command'] },
      codeLensProvider: {
        resolveProvider: true
      },
      renameProvider: {
        prepareProvider: true
      },
      workspaceSymbolProvider: true
    }
  };
});
export const initialization = new Promise<void>(resolve => {
  connection.onInitialized(async () => {
    if (hasConfigurationCapability) {
      // Register for all configuration changes.
      connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    const configuration = (await connection.workspace.getConfiguration({
      section: 'VhdlLinter'
    })) as ISettings;

    if (hasWorkspaceFolderCapability) {
      const parseWorkspaces = async () => {
        const workspaceFolders = await connection.workspace.getWorkspaceFolders();
        const folders = (workspaceFolders ?? []).map(workspaceFolder => URI.parse(workspaceFolder.uri).fsPath);
        // console.log(configuration, 'configuration');
        folders.push(...configuration.paths.additional);
        projectParser = new ProjectParser(folders, configuration.paths.ignoreRegex);
        await projectParser.init();
      };
      await parseWorkspaces();
      connection.workspace.onDidChangeWorkspaceFolders(async event => {
        projectParser.addFolders(event.added.map(folder => URI.parse(folder.uri).fsPath));
        connection.console.log('Workspace folder change event received.');
      });
    } else {
      const folders = [];
      if (rootUri) {
        folders.push(URI.parse(rootUri).fsPath);
      }
      // console.log('folders', folders);
      projectParser = new ProjectParser(folders, configuration.paths.ignoreRegex);
      await projectParser.init();
    }

    documents.all().forEach(validateTextDocument);
    projectParser.events.on('change', (...args) => {
      // console.log('projectParser.events.change', new Date().getTime(), ... args);
      documents.all().forEach(validateTextDocument);
    });
    const timeoutMap = new Map<string, NodeJS.Timeout>();
    documents.onDidChangeContent(change => {
      const oldTimeout = timeoutMap.get(change.document.uri);
      if (oldTimeout !== undefined) {
        clearTimeout(oldTimeout);
      }
      timeoutMap.set(change.document.uri, setTimeout(() => {
        validateTextDocument(change.document);
      }, 200));
      // const lintingTime = Date.now() - date;
      // console.log(`${change.document.uri}: ${lintingTime}ms`);

    });
    resolve();
  });
});
documents.onDidClose(change => {
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics: [] });
});
// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
export const linters = new Map<string, VhdlLinter>();
export const lintersValid = new Map<string, boolean>();
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  // console.log(textDocument.uri);
  // console.profile('a');
  let start = Date.now();
  const vhdlLinter = new VhdlLinter(URI.parse(textDocument.uri).fsPath, textDocument.getText(), projectParser);
  if (vhdlLinter.parsedSuccessfully || typeof linters.get(textDocument.uri) === 'undefined') {
    linters.set(textDocument.uri, vhdlLinter);
    lintersValid.set(textDocument.uri, true);
  } else {
    lintersValid.set(textDocument.uri, false);
  }
  console.log(`parsed for: ${Date.now() - start} ms.`);
  start = Date.now();
  const diagnostics = await vhdlLinter.checkAll();
  console.log(`checked for: ${Date.now() - start} ms.`);
  const test = JSON.stringify(diagnostics);
  // console.profileEnd('a');
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
  // Monitored files have change in VS Code
  connection.console.log('We received an file change event');
});
connection.onCodeAction(async (params): Promise<CodeAction[]> => {
  await initialization;
  const linter = linters.get(params.textDocument.uri);
  if (!linter) {
    return [];
  }
  // linter.codeActionEvent.emit()
  const actions = [];
  for (const diagnostic of params.context.diagnostics) {
    if (typeof diagnostic.code === 'number') {
      const callback = linter.diagnosticCodeActionRegistry[diagnostic.code];
      if (typeof callback === 'function') {
        actions.push(...callback(params.textDocument.uri));
      }
    } else if (typeof diagnostic.code === 'string') {
      const codes = diagnostic.code.split(';').map(a => parseInt(a));
      for (const code of codes) {
        const callback = linter.diagnosticCodeActionRegistry[code];
        if (typeof callback === 'function') {
          actions.push(...callback(params.textDocument.uri));
        }

      }
    }
  }
  return actions;
});
connection.onDocumentSymbol(handleOnDocumentSymbol);
interface IFindDefinitionParams {
  textDocument: {
    uri: string
  };
  position: Position;
}
const findDefinitions = async (params: IFindDefinitionParams) => {
  await initialization;
  const linter = linters.get(params.textDocument.uri);
  if (!linter) {
    return [];
  }

  let startI = linter.getIFromPosition(params.position);
  let candidates = linter.file?.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i) ?? [];
  if (linter.file?.architecture !== undefined) {
    candidates.push(...linter.file.architecture.components.filter(object => object.range.start.i <= startI && startI <= object.range.end.i));
  }
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  if (candidates.length === 0) {
    return [];
  }
  const firstRange = candidates[0].range.end.i - candidates[0].range.start.i;
  candidates = candidates.filter(c => (c.range.end.i - c.range.start.i) === firstRange).map(c => c instanceof OName ? c.parent : c);
  return candidates.flatMap(candidate => {
    if (implementsIHasDefinitions(candidate) && candidate.definitions) {
      return candidate.definitions.map(definition => {
        return {
          // originSelectionRange: linter.getPositionFromILine(startI, startI + text.length),
          range: definition.range,
          text: definition.getRoot().originalText,
          // targetSelectionRange:  Range.create(Position.create(0, 0), Position.create(0, 0)),
          uri: URI.file(definition.getRoot().file).toString()
        };
      });
    } else {
      return [];
    }
  });
};
const findBestDefinition = async (params: IFindDefinitionParams) => {
  const definitions = await findDefinitions(params);
  if (definitions.length === 0) {
    return null;
  }
  return definitions[0];
};

connection.onHover(async (params, token): Promise<Hover | null> => {
  await initialization;
  if (token.isCancellationRequested) {
    console.log('hover canceled');
    throw ErrorCodes.RequestCancelled;
  }
  const definition = await findBestDefinition(params);
  if (definition === null) {
    return null;
  }
  const lines = definition.text.split('\n').slice(definition.range.start.line, definition.range.end.line + 1);
  if (definition.range.start.line === definition.range.end.line) {
    lines[0] = lines[0].substring(definition.range.start.character, definition.range.end.character);
  } else {
    lines[0] = lines[0].substring(definition.range.start.character);
    lines[lines.length - 1] = lines[lines.length - 1].substring(0, definition.range.end.character);
  }
  return {
    contents: {
      language: 'vhdl',
      value: lines.join('\n')
    }
  };
});
connection.onDefinition(findDefinitions);
// This handler provides the initial list of the completion items.
connection.onCompletion(handleCompletion);
connection.onReferences(handleReferences);
connection.onPrepareRename(prepareRenameHandler);
connection.onRenameRequest(renameHandler);
connection.onDocumentFormatting(handleDocumentFormatting);
connection.onFoldingRanges(foldingHandler);
connection.onDocumentHighlight(documentHighlightHandler);
connection.onCodeLens(handleCodeLens);
connection.onReferences(findReferencesHandler);
connection.onExecuteCommand(handleExecuteCommand);
connection.onWorkspaceSymbol(handleOnWorkspaceSymbol);
connection.onRequest('vhdl-linter/listing', async (params: any, b: any) => {
  await initialization;
  const textDocumentUri = params.textDocument.uri;
  const linter = linters.get(textDocumentUri);
  if (typeof linter === 'undefined') {
    return;
  }
  const files: OFile[] = [];
  const unresolved: string[] = [];

  function addUnresolved(name: string) {
    if (unresolved.findIndex(search => search === name) === -1) {
      unresolved.push(name);
    }
  }

  async function parseTree(file: OFile) {
    const index = files.findIndex(fileSearch => fileSearch?.file === file?.file);
    if (index === -1) {
      files.push(file);
    } else {
      // push the file to the back to have correct compile order
      files.push(files.splice(index, 1)[0]);
    }

    for (const obj of file.objectList) {
      let found: OFile | undefined = undefined;
      if (obj instanceof OInstantiation) {
        if (obj.type === 'entity') {
          if (obj.definitions?.length > 0 && obj.definitions[0].parent instanceof OFile && obj.definitions[0].parent.entity !== undefined) {
            found = obj.definitions[0].parent;
          } else {
            addUnresolved(`${obj.library}.${obj.componentName.text}`);
          }
        } else if (obj.type === 'component') {
          if (obj.definitions?.length > 0
            && obj.definitions[0] instanceof OComponent && obj.definitions[0].definitions?.length > 0
            && obj.definitions[0].definitions[0].parent instanceof OFile) {
            found = obj.definitions[0].definitions[0].parent;
          } else {
            addUnresolved(obj.componentName.text);
          }
        }
      } else if (obj instanceof OUseClause) {
        // do not generate file listings for ieee files
        if (obj.library.toLowerCase() === 'ieee' || obj.library.toLowerCase() === 'std') {
          continue;
        }
        const matchingPackages = projectParser.getPackages().filter(pkg => pkg.name.text === obj.packageName);
        if (matchingPackages.length > 0) {
          found = matchingPackages[0].parent;
        }
      }

      if (found) {
        const vhdlLinter = new VhdlLinter(found.file, found.originalText, projectParser);
        await vhdlLinter.checkAll();
        await parseTree(vhdlLinter.file);
      }
    }

  }

  await parseTree(linter.file);
  const filesList = files.reverse().map(file => file.file.replace((rootUri ?? '').replace('file://', ''), '')).join(`\n`);
  const unresolvedList = unresolved.join('\n');
  return `files:\n${filesList}\n\nUnresolved instantiations:\n${unresolvedList}`;
});
documents.listen(connection);

// Listen on the connection
connection.listen();
