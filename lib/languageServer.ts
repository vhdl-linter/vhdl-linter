import { existsSync } from 'fs';
import { pathToFileURL } from 'url';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  CancellationToken,
  CodeAction, createConnection, DidChangeConfigurationNotification, InitializeParams, LSPErrorCodes, Position, ProposedFeatures, ResponseError, TextDocuments, TextDocumentSyncKind
} from 'vscode-languageserver/node';
import { getCompletions } from './languageFeatures/completion';
import { handleDocumentFormatting } from './languageFeatures/documentFormatting';
import { documentHighlightHandler } from './languageFeatures/documentHighlightHandler';
import { DocumentSymbols } from './languageFeatures/documentSymbol';
import { findDefinitionLinks } from './languageFeatures/findDefinition';
import { findReferencesHandler } from './languageFeatures/findReferencesHandler';
import { foldingHandler } from './languageFeatures/folding';
import { prepareRenameHandler, renameHandler } from './languageFeatures/rename';
import { semanticToken, semanticTokensLegend } from './languageFeatures/semanticToken';
import { signatureHelp } from './languageFeatures/signatureHelp';
import { workspaceSymbol } from './languageFeatures/workspaceSymbol';
import { LinterManager } from './linterManager';
import { normalizeUri } from './normalizeUri';
import { ProjectParser } from './projectParser';
import { defaultSettings, ISettings, normalizeSettings } from './settings';
import { entityConverter, converterTypes } from './entityConverter';

// Create a connection for the server. The connection auto detected protocol
// Also include all preview / proposed LSP features.
export const connection = createConnection(ProposedFeatures.all);


// Create a simple text document manager. The text document manager
// supports full document sync only
export const documents = new TextDocuments<TextDocument>(TextDocument);

let hasWorkspaceFolderCapability = false;
// let hasDiagnosticRelatedInformationCapability: boolean = false;
let projectParser: ProjectParser;
let rootUri: string | undefined;




let globalSettings: ISettings = defaultSettings;
let hasConfigurationCapability = false;
// Cache the settings of all open documents
const documentSettings = new Map<string, ISettings>();
connection.onDidChangeConfiguration((change: { settings: { VhdlLinter?: ISettings } }) => {

  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = (
      (change.settings.VhdlLinter ?? defaultSettings)
    );
  }

  // Revalidate all open text documents
  for (const document of documents.all()) {
    void validateTextDocument(document);
  }
});
export async function getDocumentSettings(resource?: URL): Promise<ISettings> {
  if (!hasConfigurationCapability) {
    return normalizeSettings(globalSettings);
  }
  let result = documentSettings.get(resource?.toString() ?? '');
  if (!result) {
    result = normalizeSettings(await connection.workspace.getConfiguration({
      scopeUri: resource?.toString(),
      section: 'VhdlLinter'
    }) as ISettings);
  }
  documentSettings.set(resource?.toString() ?? '', result);
  return result;
}
connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;
  hasWorkspaceFolderCapability =
    capabilities.workspace?.workspaceFolders ?? false;
  if (params.rootUri !== null) {
    rootUri = params.rootUri;
  }
  hasConfigurationCapability = capabilities.workspace?.configuration ?? false;
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      codeActionProvider: true,
      // Tell the client that the server supports code completion
      completionProvider: {
        resolveProvider: false
      },
      semanticTokensProvider: {
        legend: semanticTokensLegend,
        range: false,
        full: {
          delta: false
        }
      },

      documentSymbolProvider: true,
      definitionProvider: true,
      hoverProvider: true,
      documentFormattingProvider: {
        workDoneProgress: true
      },
      referencesProvider: true,
      foldingRangeProvider: true,
      documentHighlightProvider: true,
      executeCommandProvider: { commands: ['vhdl-linter:lsp-command'] },
      renameProvider: {
        prepareProvider: true
      },
      workspaceSymbolProvider: true,
      signatureHelpProvider: {
        triggerCharacters: [
          '(', ',', '>'
        ]
      }
    }
  };
});
export const initialization = new Promise<void>(resolve => {
  connection.onInitialized(() => {

    const handler = async () => {
      const progress = await connection.window.createWorkDoneProgress();
      progress.begin(
        'VHDL-linter initializing...',
        0
      );
      if (hasConfigurationCapability) {
        // Register for all configuration changes.
        await connection.client.register(DidChangeConfigurationNotification.type, undefined);
      }
      const configuration = (await connection.workspace.getConfiguration({
        section: 'VhdlLinter'
      })) as ISettings;

      if (hasWorkspaceFolderCapability) {
        const parseWorkspaces = async () => {
          const workspaceFolders = await connection.workspace.getWorkspaceFolders();
          const folders = (workspaceFolders ?? []).map(workspaceFolder => new URL(workspaceFolder.uri));
          folders.push(...configuration.paths.additional.map(path => pathToFileURL(path))
            .filter(url => existsSync(url)));

          projectParser = await ProjectParser.create(folders, configuration.paths.ignoreRegex, getDocumentSettings, false, progress);
        };
        await parseWorkspaces();
        connection.workspace.onDidChangeWorkspaceFolders(event => {
          projectParser.addFolders(event.added.map(folder => new URL(folder.uri)));
          connection.console.log('Workspace folder change event received.');
        });
      } else {
        const folders = [];
        if (rootUri !== undefined) {
          folders.push(new URL(rootUri));
        }
        projectParser = await ProjectParser.create(folders, configuration.paths.ignoreRegex, getDocumentSettings, false, progress);
      }
      for (const textDocument of documents.all()) {
        await validateTextDocument(textDocument);
      }
      projectParser.events.on('change', (_, uri: string) => {
        // A file in project parser got changed
        // Revalidate all *other* files. (The file itself gets directly handled.)
        for (const document of documents.all()) {
          if (normalizeUri(document.uri) !== uri) {
            void validateTextDocument(document, true);
          }
        }
      });
      documents.onDidChangeContent(change => {
        void validateTextDocument(change.document);
      });
      progress.done();
      resolve();
    };
    handler().catch((err: Error) => {
      console.error(err);
      const message = `Error during initialization: ${err.message}`;
      connection.window.showErrorMessage(message);
    });
  });
});
documents.onDidClose(async change => {
  await connection.sendDiagnostics({ uri: change.document.uri, diagnostics: [] });
});
const linterManager = new LinterManager();
// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
async function validateTextDocument(textDocument: TextDocument, fromProjectParser = false) {
  try {
    const vhdlLinter = await linterManager.triggerRefresh(textDocument.uri, textDocument.getText(), projectParser, getDocumentSettings, fromProjectParser);
    const diagnostics = await vhdlLinter.checkAll();
    diagnostics.forEach((diag) => diag.source = 'vhdl-linter');
    await connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  } catch (err) {
    // Ignore cancelled
    if (!(err instanceof ResponseError && err.code === LSPErrorCodes.RequestCancelled)) {
      throw err;
    }
  }
}

connection.onDidChangeWatchedFiles(() => {
  // Monitored files have change in VS Code
  connection.console.log('We received an file change event');
});
connection.onCodeAction(async (params, token): Promise<CodeAction[]> => {
  const linter = await linterManager.getLinter(params.textDocument.uri, token);
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
connection.onDocumentSymbol(async (params, token) => {
  const linter = await linterManager.getLinter(params.textDocument.uri, token);

  return DocumentSymbols.get(linter);
});
interface IFindDefinitionParams {
  textDocument: {
    uri: string
  };
  position: Position;
}

const findBestDefinition = async (params: IFindDefinitionParams, token: CancellationToken) => {
  const linter = await linterManager.getLinter(params.textDocument.uri, token);

  const definitions = findDefinitionLinks(linter, params.position);
  return definitions[0] ?? null;
};

connection.onHover(async (params, token) => {
  const definition = await findBestDefinition(params, token);
  if (definition === null) {
    return null;
  }
  const lines = definition.text.split('\n').slice(definition.targetRange.start.line, definition.targetRange.end.line + 1);
  if (definition.targetRange.start.line === definition.targetRange.end.line) {
    lines[0] = lines[0]!.substring(definition.targetRange.start.character, definition.targetRange.end.character);
  } else {
    lines[0] = lines[0]!.substring(definition.targetRange.start.character);
    lines[lines.length - 1] = lines[lines.length - 1]!.substring(0, definition.targetRange.end.character);
  }
  return {
    contents: {
      language: 'vhdl',
      value: lines.join('\n')
    }
  };
});
connection.onDefinition(async (params, token) => {
  const linter = await linterManager.getLinter(params.textDocument.uri, token);

  const definitions = findDefinitionLinks(linter, params.position);
  if (definitions.length === 0) {
    return null;
  }
  return definitions;
});
connection.onCompletion(async (params, token) => {
  const linter = await linterManager.getLinter(params.textDocument.uri, token);
  return getCompletions(linter, params.position);
});
connection.onReferences(async (params, token) => {
  const linter = await linterManager.getLinter(params.textDocument.uri, token);

  return findReferencesHandler(linter, params.position);

});

connection.onPrepareRename(async (params, token) => {
  const linter = await linterManager.getLinter(params.textDocument.uri, token);

  return prepareRenameHandler(linter, params.position);
});
connection.onRenameRequest(async (params, token) => {
  const linter = await linterManager.getLinter(params.textDocument.uri, token);

  return renameHandler(linter, params.position, params.newName);
});
connection.onDocumentFormatting(handleDocumentFormatting);
connection.onFoldingRanges(async (params, token) => {
  const linter = await linterManager.getLinter(params.textDocument.uri, token);
  return foldingHandler(linter);
});
connection.onDocumentHighlight(async (params, token) => {
  const linter = await linterManager.getLinter(params.textDocument.uri, token);

  return documentHighlightHandler(linter, params);

});
connection.onWorkspaceSymbol(async params => {
  await initialization;
  const configuration = await getDocumentSettings();
  return workspaceSymbol(params, projectParser, configuration.paths.additional);
});
connection.onSignatureHelp(async (params, token) => {
  const linter = await linterManager.getLinter(params.textDocument.uri, token);
  return signatureHelp(linter, params.position);
});
connection.languages.semanticTokens.on(async (params, token) => {
  const linter = await linterManager.getLinter(params.textDocument.uri, token, false);
  const settings = await getDocumentSettings(new URL(params.textDocument.uri));
  if (!settings.semanticTokens) {
    return {
      data: []
    };
  }
  const tokens = semanticToken(linter, settings.semanticTokensDirectionColoring);
  return tokens;
});
connection.onRequest('vhdl-linter/template', async (params: { textDocument: { uri: string }, type: converterTypes, position?: Position }, token?: CancellationToken) => {
  const linter = await linterManager.getLinter(params.textDocument.uri, token);
  const settings = await getDocumentSettings(new URL(params.textDocument.uri));
  return entityConverter(linter, params.type, settings, params.position);
});
  documents.listen(connection);

  // Listen on the connection
  connection.listen();
