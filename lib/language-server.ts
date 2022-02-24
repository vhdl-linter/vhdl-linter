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
import { implementsIHasDefinitions, OFile, OFileWithEntity, OFileWithEntityAndArchitecture, OInstantiation, OName, OMagicCommentDisable } from './parser/objects';
import { ProjectParser } from './project-parser';
import { VhdlLinter } from './vhdl-linter';

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
    additional: string[]
  };
  style: {
    preferedLogicType: 'std_logic' | 'std_ulogic';
  };
  rules: {
    warnLibrary: boolean;
    warnLogicType: boolean;
  };
}
const defaultSettings: ISettings = {
  ports: {
    outRegex: '^o_',
    inRegex: '^i_',
    enablePortStyle: true,
  },
  paths: {
    additional: []
  },
  style: {
    preferedLogicType: 'std_ulogic'
  },
  rules: {
    warnLogicType: true,
    warnLibrary: true
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

    if (hasWorkspaceFolderCapability) {
      const parseWorkspaces = async () => {
        const workspaceFolders = await connection.workspace.getWorkspaceFolders();
        const folders = (workspaceFolders ?? []).map(workspaceFolder => URI.parse(workspaceFolder.uri).fsPath);
        const configuration = (await connection.workspace.getConfiguration({
          section: 'VhdlLinter'
        })) as ISettings;
        console.log(configuration, 'configuration');
        folders.push(... configuration.paths.additional);
        projectParser = new ProjectParser(folders);
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
      console.log('folders', folders);
      projectParser = new ProjectParser(folders);
      await projectParser.init();
    }

    documents.all().forEach(validateTextDocument);
    projectParser.events.on('change', (...args) => {
      // console.log('projectParser.events.change', new Date().getTime(), ... args);
      documents.all().forEach(validateTextDocument);
    });

    documents.onDidChangeContent(change => {
      // console.log('onDidChangeContent', new Date().getTime());
      validateTextDocument(change.document);
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
  console.log(textDocument.uri);
  console.profile('a');
  const vhdlLinter = new VhdlLinter(URI.parse(textDocument.uri).fsPath, textDocument.getText(), projectParser);
  if (typeof vhdlLinter.file !== 'undefined' || typeof linters.get(textDocument.uri) === 'undefined') {
    linters.set(textDocument.uri, vhdlLinter);
    lintersValid.set(textDocument.uri, true);
  } else {
    lintersValid.set(textDocument.uri, false);
  }
  const diagnostics = await vhdlLinter.checkAll();
  const test = JSON.stringify(diagnostics);
  console.profileEnd('a');

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
  const candidates = linter.file?.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i) ?? [];
  if (linter.file instanceof OFileWithEntityAndArchitecture) {
    candidates.push(...linter.file.architecture.components.filter(object => object.range.start.i <= startI && startI <= object.range.end.i));
  }
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  let candidate = candidates[0];
  if (!candidate) {
    return [];
  }
  if (candidate instanceof OName) {
    candidate = candidate.parent;
  }
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
  }
  return [];
};
const findBestDefinition = async (params: IFindDefinitionParams) => {
  const definitions = await findDefinitions(params);
  if (definitions.length === 0) {
    return null;
  }
  return definitions[0];
}

connection.onHover(async (params, token): Promise<Hover | null> => {
  await initialization;
  if (token.isCancellationRequested) {
    console.log('hover canceld');
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
connection.onDefinition(findBestDefinition);
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

  async function parseTree(file: OFile) {
    if (files.findIndex(fileSearch => fileSearch?.file === file?.file) === -1) {
      // debugger;
      files.push(file);
    }
    for (const object of file?.objectList ?? []) {
      if (object instanceof OInstantiation) {
        if (object.definitions && object.definitions[0].parent instanceof OFileWithEntity) {
          const vhdlLinter = new VhdlLinter(object.definitions[0].parent.file, object.definitions[0].parent.originalText, projectParser);
          await vhdlLinter.checkAll();
          await parseTree(vhdlLinter.file);
        } else {
          // throw new Error(`Can not find ${object.componentName}`);q
        }
      }
    }

  }

  await parseTree(linter.file);
  return (files.map(file => {
    if (file instanceof OFileWithEntity) {
      return [file.file.replace((rootUri ?? '').replace('file://', ''), ''), file.entity.library];
    }
  }).filter(file => file) as [string, string][]).map(a => `${a[0]}\t${a[1]}`).join(`\n`);
});
documents.listen(connection);

// Listen on the connection
connection.listen();
