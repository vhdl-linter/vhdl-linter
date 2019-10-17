import {
  createConnection,
  SymbolKind,
  TextDocuments,
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CodeAction,
  CompletionItemKind,
  CompletionParams,
  WorkspaceEdit,
  TextEdit,
  Location,
  DocumentSymbol,
  Range,
  Position,
  Hover
} from 'vscode-languageserver';
import { VhdlLinter } from './vhdl-linter';
import { ProjectParser, OThing, OPackage, OProjectEntity} from './project-parser';
import { OFile, OArchitecture, ORead, OWrite, OSignal, OFunction, OForLoop, OForGenerate} from './parser/objects';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
// let hasDiagnosticRelatedInformationCapability: boolean = false;
let projectParser: ProjectParser = new ProjectParser([]);

connection.onInitialize((params: InitializeParams) => {
  let capabilities = params.capabilities;
  // console.error(JSON.stringify(capabilities));
  // Does the client support the `workspace/configuration` request?
  // If not, we will fall back using global settings
  hasConfigurationCapability =
    capabilities.workspace && !!capabilities.workspace.configuration || false;
  hasWorkspaceFolderCapability =
    capabilities.workspace && !!capabilities.workspace.workspaceFolders || false;
  // hasDiagnosticRelatedInformationCapability =
  //   capabilities.textDocument &&
  //   capabilities.textDocument.publishDiagnostics &&
  //   capabilities.textDocument.publishDiagnostics.relatedInformation || false;

  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      codeActionProvider: true,
      // Tell the client that the server supports code completion
      completionProvider: {
        resolveProvider: true
      },
      documentSymbolProvider: true,
      definitionProvider: true,
      hoverProvider: true
    }
  };
});

connection.onInitialized(async () => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  console.error(hasWorkspaceFolderCapability, 'hasWorkspaceFolderCapability');
  if (hasWorkspaceFolderCapability) {

    const parseWorkspaces = async () => {
      const workspaceFolders = await connection.workspace.getWorkspaceFolders();
      if (workspaceFolders) {
        const folders = workspaceFolders.map(workspaceFolder => workspaceFolder.uri);
        projectParser = new ProjectParser(folders);
      }
    };
    parseWorkspaces();
    connection.workspace.onDidChangeWorkspaceFolders(async _event => {
      parseWorkspaces();
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// The example settings
interface ISettings {
  workspaces: string[];
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ISettings = { workspaces: [] };
let globalSettings: ISettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ISettings>> = new Map();

connection.onDidChangeConfiguration(change => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <ISettings>(
      (change.settings.languageServerExample || defaultSettings)
    );
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ISettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'languageServerExample'
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});
const linters = new Map<string, VhdlLinter>();
async function validateTextDocument(textDocument: TextDocument): Promise<void> {

  const vhdlLinter = new VhdlLinter(textDocument.uri, textDocument.getText(), projectParser);
  if (typeof vhdlLinter.tree !== 'undefined') {
    linters.set(textDocument.uri, vhdlLinter);
  }
  const diagnostics: Diagnostic[] = (await vhdlLinter.checkAll()).map(message => {
    let severity: DiagnosticSeverity;
    if (message.severity === 'error') {
      severity = DiagnosticSeverity.Error;
    } else if (message.severity === 'warning') {
      severity = DiagnosticSeverity.Warning;
    } else {
      severity = DiagnosticSeverity.Information;
    }
    return {
      severity: severity,
      range: message.location.position,
      message: message.excerpt
    };
  });
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
  // Monitored files have change in VS Code
  connection.console.log('We received an file change event');
});
connection.onCodeAction(async (params): Promise<CodeAction[]> => {
  const linter = linters.get(params.textDocument.uri);
  if (!linter) {
    return [];
  }

  const messages = await linter.checkAll();
  const message = messages.find(message => {
    if (typeof message.solutions === 'undefined' || messages.length === 0) {
      return false;
    }
    return message.location.position.start.character === params.range.start.character &&
      message.location.position.start.line === params.range.start.line &&
      message.location.position.end.character === params.range.end.character &&
      message.location.position.end.line === params.range.end.line;
  });
  if (message && message.solutions) {
    return message.solutions.filter(solution => solution.replaceWith).map(solution => {
      const workspaceEdit: WorkspaceEdit = {};
      const textEdit: TextEdit = TextEdit.replace(solution.position, solution.replaceWith);
      workspaceEdit.changes = {};
      workspaceEdit.changes[params.textDocument.uri] = [textEdit];
      return CodeAction.create(
        solution.title,
        workspaceEdit
      );
    });
  }
  return [];
});
connection.onDocumentSymbol(async (params): Promise<DocumentSymbol[]> => {
  console.error('DOCUMENT SYMBOL');
  const linter = linters.get(params.textDocument.uri);
  if (!linter) {
    return [];
  }
  const parseArchitecture = (architecture: OArchitecture): DocumentSymbol[] => {
    const symbols: DocumentSymbol[] = [{
      name: 'signals',
      kind: SymbolKind.Class,
      range: linter.getPositionFromILine(architecture.startI),
      selectionRange: linter.getPositionFromILine(architecture.startI, architecture.endI),
      children: architecture.signals.map(signal => ({
        name: signal.name,
        deprecated: signal.isRegister(),
        kind: SymbolKind.Variable,
        range: linter.getPositionFromILine(signal.startI, signal.endI),
        selectionRange: linter.getPositionFromILine(signal.startI, signal.endI)
      }))
    },
    {
      name: 'instantiation',
      kind: SymbolKind.Class,
      range: linter.getPositionFromILine(architecture.startI),
      selectionRange: linter.getPositionFromILine(architecture.startI, architecture.endI),
      children: architecture.instantiations.map(instantiation => ({
        name: instantiation.label + ': ' + instantiation.componentName,
        detail: instantiation.label,
        kind: SymbolKind.Object,
        range: linter.getPositionFromILine(instantiation.startI, instantiation.endI),
        selectionRange: linter.getPositionFromILine(instantiation.startI, instantiation.endI)
      }))
    },
    {
      name: 'process',
      kind: SymbolKind.Class,
      range: linter.getPositionFromILine(architecture.startI),
      selectionRange: linter.getPositionFromILine(architecture.startI, architecture.endI),
      children: architecture.processes.map(process => ({
        name: process.label || '',
        detail: process.label,
        kind: SymbolKind.Object,
        range: linter.getPositionFromILine(process.startI, process.endI),
        selectionRange: linter.getPositionFromILine(process.startI, process.endI),
        children: process.getStates().map(state => ({
          name: state.name,
          kind: SymbolKind.EnumMember,
          range: linter.getPositionFromILine(state.startI, state.endI),
          selectionRange: linter.getPositionFromILine(state.startI, state.endI),

        }))
      }))
    }];
    for (const generate of architecture.generates) {
      symbols.push({
        name: linter.text.split('\n')[linter.getPositionFromILine(generate.startI, generate.endI).start.line],
        kind: SymbolKind.Enum,
        range: linter.getPositionFromILine(generate.startI, generate.endI),
        selectionRange: linter.getPositionFromILine(generate.startI, generate.endI),
        children: parseArchitecture(generate)
      });
    }
    return symbols;
  };
  return [
    {
      name: 'generics',
      kind: SymbolKind.Class,
      range: linter.getPositionFromILine(linter.tree.entity.startI),
      selectionRange: linter.getPositionFromILine(linter.tree.entity.startI, linter.tree.entity.endI),
      children: linter.tree.entity.generics.map(generic => DocumentSymbol.create(generic.name, undefined, SymbolKind.Variable, linter.getPositionFromILine(generic.startI, generic.endI), linter.getPositionFromILine(generic.startI, generic.endI)))
    },
    {
      name: 'ports',
      kind: SymbolKind.Class,
      range: linter.getPositionFromILine(linter.tree.entity.startI),
      selectionRange: linter.getPositionFromILine(linter.tree.entity.startI, linter.tree.entity.endI),
      children: linter.tree.entity.ports.map(port => DocumentSymbol.create(port.name, undefined, SymbolKind.Variable, linter.getPositionFromILine(port.startI, port.endI), linter.getPositionFromILine(port.startI, port.endI)))
    },
    ...parseArchitecture(linter.tree.architecture)
  ];
});
const positionFromI = (text: string, i: number) => {
  const slice = text.slice(0, i);
  const lines = slice.split('\n');
  return Position.create(lines.length - 1, lines[lines.length - 1].length - 1);
};
interface IFindDefinitionParams {
  textDocument: {
    uri: string
  };
  position: Position;
}
const findDefinition = async (params: IFindDefinitionParams) => {
  const linter = linters.get(params.textDocument.uri);
  if (!linter) {
    return null;
  }

  let startI = linter.getIFromPosition(params.position);
  while (linter.text[startI].match(/\S/)) {
    startI--;
  }
  let text = linter.text.slice(startI);
  const wordMatch = text.match(/(entity\s+)?[a-z][\w.]*/i);
  if (!wordMatch) {
    console.error('no word match');
    return null;
  }
  text = wordMatch[0];
  if (typeof wordMatch.index === 'undefined') {
    return null;
  }
  startI += wordMatch.index;

  const match = text.match(/(?:entity\s+)(\w+)\.(\w+)/i);
  if (!match) {
    // console.error('signal maybe', startI);
    //          console.log('path', textEditor.getPath());
    //          console.log('linter', linter);
    let result: OSignal|OFunction|false|OThing|OForLoop|OForGenerate|undefined;
    // try {
    const foundThing = linter.tree.objectList.find(obj => {
      if (obj instanceof ORead || obj instanceof OWrite) {
        return obj.begin <= startI && obj.end >= startI;
      } else {
        return false;
      }
    });
    // console.error('foundThing', foundThing);
    if (!foundThing || !(foundThing instanceof ORead || foundThing instanceof OWrite)) {
      //              console.log('foundThing not foundThing', foundThing, startI);
      return null;
    }
    result = linter.tree.architecture.findRead(foundThing, linter.packageThings);
    //           } catch (e) {
    // //            console.log(e);
    //           }
    //          console.log('reads', result);
    if (typeof result === 'boolean') {
      return null;
    }
    const position = result instanceof OThing
    ? Range.create(positionFromI(result.parent.fileCache.text, result.startI), positionFromI(result.parent.fileCache.text, result.endI))
    : linter.getPositionFromILine(result.startI, result.endI);
    // console.error();
    return {
      // originSelectionRange: linter.getPositionFromILine(startI, startI + text.length),
      range: position,
      text: result instanceof OThing ? result.parent.fileCache.text : linter.text,
      // targetSelectionRange: position,
      uri: result instanceof OThing ? 'file://' + result.parent.path : params.textDocument.uri
    };
  }
  const [, library, entityName] = match;
  const entities = (await linter.projectParser.getEntities()).filter((entity: OProjectEntity) => {
    return entity.name === entityName && (entity.library ? entity.library === library : true);
  });
  const entity = entities[0];
  console.error('entity', entity);
  return {
    // originSelectionRange: linter.getPositionFromILine(startI, startI + text.length),
    range: Range.create(positionFromI(entity.fileCache.text, entity.start), positionFromI(entity.fileCache.text, entity.end)),
    text: entity.fileCache.text,
    // targetSelectionRange:  Range.create(Position.create(0, 0), Position.create(0, 0)),
    uri: 'file://' + entity.file
  };
};
connection.onHover(async (params): Promise<Hover|null> => {
  const definition = await findDefinition(params);
  if (definition === null) {
    return null;
  }
  const lines = definition.text.split('\n').slice(definition.range.start.line, definition.range.end.line + 1);
  lines[0] = lines[0].slice(definition.range.start.character);
  lines[lines.length - 1] = lines[lines.length - 1].slice(0, definition.range.end.character + 1);
  return {
    contents: {
      language: 'vhdl',
      value: lines.join('\n')
    }
  };
});
connection.onDefinition(async (params): Promise<Location|null> => {
  console.error(params);
  return await findDefinition(params);
});
// This handler provides the initial list of the completion items.
connection.onCompletion(
  (params: CompletionParams): CompletionItem[] => {
    const linter = linters.get(params.textDocument.uri);
    if (typeof linter === 'undefined') {
      console.error('linter undefined');
      return [];
    }
    if (typeof linter.tree === 'undefined') {
      console.error('tree undefined');
      return [];
    }
    linter.tree.objectList.sort((b, a) => a.startI - b.startI);
    let i = linter.getIFromPosition(params.position);
    const obj = linter.tree.objectList.find(obj => obj.startI < i);
    if (typeof obj === 'undefined') {
      return [];
    }
    let parent = obj.parent;
    let counter = 100;
    const candidates: CompletionItem[] = [];
    while ((parent instanceof OFile) === false) {
      if (parent instanceof OArchitecture) {
        for (const signal of parent.signals) {
          candidates.push({ label: signal.name, kind: CompletionItemKind.Variable });
        }
        for (const type of parent.types) {
          candidates.push({ label: type.name, kind: CompletionItemKind.TypeParameter });
          candidates.push(...type.states.map(state => {
            return {
              label: state.name,
              kind: CompletionItemKind.EnumMember
            };
          }));
        }
      }
      parent = (parent as any).parent;
      counter--;
      if (counter === 0) {
        //        console.log(parent, parent.parent);
        throw new Error('Infinite Loop?');
      }
    }
    const packageThingsUnique = Array.from(new Set(linter.packageThings));
    console.error('packageThings');
    candidates.push(...packageThingsUnique.map(packageThing => {
      return {
        label: packageThing.name,
        kind: CompletionItemKind.Text
      };
    }));
    return candidates;
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    if (item.data === 1) {
      item.detail = 'TypeScript details';
      item.documentation = 'TypeScript documentation';
    } else if (item.data === 2) {
      item.detail = 'JavaScript details';
      item.documentation = 'JavaScript documentation';
    }
    return item;
  }
);

/*
connection.onDidOpenTextDocument((params) => {
    // A text document got opened in VS Code.
    // params.uri uniquely identifies the document. For documents store on disk this is a file URI.
    // params.text the initial full content of the document.
    connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
    // The content of a text document did change in VS Code.
    // params.uri uniquely identifies the document.
    // params.contentChanges describe the content changes to the document.
    connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
    // A text document got closed in VS Code.
    // params.uri uniquely identifies the document.
    connection.console.log(`${params.textDocument.uri} closed.`);
});
*/

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
