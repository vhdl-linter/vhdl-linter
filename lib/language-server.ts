import {
  createConnection,
  SymbolKind,
  TextDocuments,
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
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
  Hover,
  DocumentFormattingParams,
  ReferenceParams,
  FoldingRange,
  FoldingRangeParams,
  CodeActionKind,
  CancellationToken,
  ErrorCodes,
  PrepareRenameRequest
} from 'vscode-languageserver';
import { VhdlLinter } from './vhdl-linter';
import { ProjectParser } from './project-parser';
import { OFile, OArchitecture, ORead, OWrite, OSignal, OFunction, OForLoop, OForGenerate, OInstantiation, OMapping, OEntity, OFileWithEntity, OFileWithEntityAndArchitecture, OFileWithPackage, ORecord, ObjectBase, OType, OMappingName, ORecordChild, OEnum, OProcess, OStatement, OIf, OIfClause, OMap, OUseStatement, OState, OToken, OProcedureInstantiation, OName, OMentionable, ODefitionable } from './parser/objects';
import { mkdtempSync, writeFile, readFile } from 'fs';
import { tmpdir, type } from 'os';
import { sep } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { foldingHandler } from './languageFeatures/folding';
import { handleOnDocumentSymbol } from './languageFeatures/documentSymbol';
import { documentHighlightHandler } from './languageFeatures/documentHightlightHandler';
import { findReferencesHandler, prepareRenameHandler, renameHandler } from './languageFeatures/findReferencesHandler';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
export const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasWorkspaceFolderCapability: boolean = false;
// let hasDiagnosticRelatedInformationCapability: boolean = false;
let projectParser: ProjectParser;
let rootUri: string | undefined;
connection.onInitialize((params: InitializeParams) => {
  let capabilities = params.capabilities;
  hasWorkspaceFolderCapability =
    capabilities.workspace && !!capabilities.workspace.workspaceFolders || false;
  if (params.rootUri) {
    rootUri = params.rootUri;
  }
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
      }
    }
  };
});
export const initialization = new Promise(resolve => {
  connection.onInitialized(async () => {
    if (hasWorkspaceFolderCapability) {
      const parseWorkspaces = async () => {
        const workspaceFolders = await connection.workspace.getWorkspaceFolders();
        const folders = (workspaceFolders ?? []).map(workspaceFolder => workspaceFolder.uri.replace('file://', ''));
        projectParser = new ProjectParser(folders);
        await projectParser.init();
      };
      await parseWorkspaces();
      connection.workspace.onDidChangeWorkspaceFolders(async event => {
        projectParser.addFolders(event.added.map(folder => folder.uri.replace('file://', '')));
        connection.console.log('Workspace folder change event received.');
      });
    } else {
      const folders = [];
      if (rootUri) {
        folders.push(rootUri.replace('file://', ''));
      }
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
  const vhdlLinter = new VhdlLinter(textDocument.uri.replace('file://', ''), textDocument.getText(), projectParser);
  if (typeof vhdlLinter.tree !== 'undefined' || typeof linters.get(textDocument.uri) === 'undefined') {
    linters.set(textDocument.uri, vhdlLinter);
    lintersValid.set(textDocument.uri, true);
  } else {
    lintersValid.set(textDocument.uri, false);
  }
  const diagnostics = vhdlLinter.checkAll();
  const test = JSON.stringify(diagnostics);
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
const findDefinition = async (params: IFindDefinitionParams) => {
  await initialization;
  const linter = linters.get(params.textDocument.uri);
  if (!linter) {
    return null;
  }

  let startI = linter.getIFromPosition(params.position);
  const candidates = linter.tree.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i);
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  let candidate = candidates[0];
  if (!candidate) {
    return null;
  }
  if (candidate instanceof OName) {
    candidate = candidate.parent;
  }
  if (candidate instanceof ODefitionable && candidate.definition) {
    return {
      // originSelectionRange: linter.getPositionFromILine(startI, startI + text.length),
      range: candidate.definition.range,
      text: candidate.definition.getRoot().originalText,
      // targetSelectionRange:  Range.create(Position.create(0, 0), Position.create(0, 0)),
      uri: 'file://' + candidate.definition.getRoot().file
    };
  }

  return null;
};
connection.onHover(async (params, token): Promise<Hover | null> => {
  await initialization;
  if (token.isCancellationRequested) {
    console.log('hover canceld');
    throw ErrorCodes.RequestCancelled;
  }
  const definition = await findDefinition(params);
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
connection.onDefinition(async (params): Promise<Location | null> => {
  await initialization;
  return await findDefinition(params);
});
// This handler provides the initial list of the completion items.
connection.onCompletion(async (params: CompletionParams): Promise<CompletionItem[]> => {
  await initialization;
  const completions: CompletionItem[] = [];
  const linter = linters.get(params.textDocument.uri);
  if (typeof linter === 'undefined') {
    return completions;
  }
  if (typeof linter.tree === 'undefined') {
    return completions;
  }
  const document = documents.get(params.textDocument.uri);
  if (document) {
    const line = document.getText(Range.create(Position.create(params.position.line, 0), Position.create(params.position.line + 1, 0)));
    const match = line.match(/^\s*use\s+/i);
    if (match) {
      for (const pkg of projectParser.getPackages()) {
        completions.push({ label: pkg.name });
        pkg.library && completions.push({ label: pkg.library });
      }
    }
    completions.push({ label: 'all' });
    completions.push({ label: 'work' });
  }

  let startI = linter.getIFromPosition(params.position);
  const candidates = linter.tree.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i);
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  const obj = candidates[0];
  if (!obj) {
    return completions;
  }

  let parent = obj.parent;
  let counter = 100;
  while ((parent instanceof OFile) === false) {
    // console.log(parent instanceof OFile, parent);
    if (parent instanceof OArchitecture) {
      for (const signal of parent.signals) {
        completions.push({ label: signal.name.text, kind: CompletionItemKind.Variable });
      }
      for (const type of parent.types) {
        completions.push({ label: type.name.text, kind: CompletionItemKind.TypeParameter });
        if (type instanceof OEnum) {
          completions.push(...type.states.map(state => {
            return {
              label: state.name.text,
              kind: CompletionItemKind.EnumMember
            };
          }));
        }
      }
    }
    parent = (parent as any).parent;
    counter--;
    if (counter === 0) {
      //        console.log(parent, parent.parent);
      throw new Error('Infinite Loop?');
    }
  }
  if (parent instanceof OFileWithEntity) {
    for (const port of parent.entity.ports) {
      completions.push({ label: port.name.text, kind: CompletionItemKind.Field });
    }
    for (const port of parent.entity.generics) {
      completions.push({ label: port.name.text, kind: CompletionItemKind.Constant });
    }
  }
  for (const pkg of linter.packages) {
    const ieee = pkg.parent.file.match(/ieee/i) !== null;
    for (const obj of pkg.getRoot().objectList) {
      if ((obj as any).name) {
        const text = (obj as any).name instanceof OName ? (obj as any).name.text : (obj as any).name;
        completions.push({
          label: ieee ? text.toLowerCase() : text,
          kind: CompletionItemKind.Text
        });
      }
    }
  }
  const completionsUnique = completions.filter((completion, completionI) =>
    completions.slice(0, completionI).findIndex(completionFind => completion.label.toLowerCase() === completionFind.label.toLowerCase()) === -1
  );
  return completionsUnique;
}
);
connection.onReferences(async (params: ReferenceParams): Promise<Location[]> => {
  await initialization;
  const linter = linters.get(params.textDocument.uri);
  if (typeof linter === 'undefined') {
    return [];
  }
  if (typeof linter.tree === 'undefined') {
    return [];
  }
  let startI = linter.getIFromPosition(params.position);
  const candidates = linter.tree.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i);
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  const candidate = candidates[0];
  if (!candidate) {
    return [];
  }
  if (candidate instanceof OToken) {
    return linter.tree.objectList.filter(obj => obj instanceof OToken && obj.text.toLowerCase() === candidate.text.toLowerCase() && obj !== candidate).map(obj => Location.create(params.textDocument.uri, obj.range));
  }
  return [];
});
connection.onPrepareRename(prepareRenameHandler);
connection.onRenameRequest(renameHandler);
connection.onDocumentFormatting(async (params: DocumentFormattingParams): Promise<TextEdit[] | null> => {
  const document = documents.get(params.textDocument.uri);
  if (typeof document === 'undefined') {
    return null;
  }
  const text = document.getText();
  const path = mkdtempSync(tmpdir() + sep);
  const tmpFile = path + sep + 'beautify';
  await promisify(writeFile)(tmpFile, text);
  const emacs_script_path = __dirname + '/../../emacs-vhdl-formating-script.lisp';
  await promisify(exec)(`emacs --batch -l ${emacs_script_path} -f vhdl-batch-indent-region ${tmpFile}`);
  return [{
    range: Range.create(document.positionAt(0), document.positionAt(text.length)),
    newText: await promisify(readFile)(tmpFile, { encoding: 'utf8' })
  }];
});
connection.onFoldingRanges(foldingHandler);
connection.onDocumentHighlight(documentHighlightHandler);
connection.onCodeLens(async (params) => {

  await initialization;
  const linter = linters.get(params.textDocument.uri);
  if (typeof linter === 'undefined') {
    return [];
  }
  if (typeof linter.tree === 'undefined') {
    return [];
  }
  return linter.getCodeLens(params.textDocument.uri);
});
connection.onReferences(findReferencesHandler);
connection.onExecuteCommand(async params => {
  await initialization;
  if (!params.arguments) {
    return;
  }
  console.log(params);
  const textDocumentUri = params.arguments[0];
  const linter = linters.get(textDocumentUri);
  if (typeof linter === 'undefined') {
    return;
  }
  const callback = linter.commandCallbackRegistry[parseInt(params.arguments[1], 10)];
  const edits: TextEdit[] = [];
  if (typeof callback === 'function') {
    edits.push(...callback(textDocumentUri));
  }
  const document = documents.get(textDocumentUri);
  if (!document) {
    return;
  }
  await connection.workspace.applyEdit({
    edit: {
      changes: {
        [textDocumentUri]: edits
      }
    }
  });
});
connection.onRequest('vhdl-linter/listing', async (params: any, b: any) => {
  await initialization;
  const textDocumentUri = params.textDocument.uri;
  const linter = linters.get(textDocumentUri);
  if (typeof linter === 'undefined') {
    return;
  }
  const files: OFile[] = [];

  function parseTree(file: OFile) {
    if (files.findIndex(fileSearch => fileSearch?.file === file?.file) === -1) {
      // debugger;
      files.push(file);
    }
    for (const object of file?.objectList ?? []) {
      if (object instanceof OInstantiation) {
        if (object.definition) {
          const vhdlLinter = new VhdlLinter(object.definition.parent.file, object.definition.parent.originalText, projectParser);
          vhdlLinter.checkAll();
          parseTree(vhdlLinter.tree);
        } else {
          // throw new Error(`Can not find ${object.componentName}`);q
        }
      }
    }

  }

  parseTree(linter.tree);
  return (files.map(file => {
    if (file instanceof OFileWithEntity) {
      return [file.file.replace((rootUri ?? '').replace('file://', ''), ''), file.entity.library];
    }
  }).filter(file => file) as [string, string][]).map(a => `${a[0]}\t${a[1]}`).join(`\n`);
});
documents.listen(connection);

// Listen on the connection
connection.listen();
