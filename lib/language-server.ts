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
  ErrorCodes
} from 'vscode-languageserver';
import { VhdlLinter } from './vhdl-linter';
import { ProjectParser} from './project-parser';
import { OFile, OArchitecture, ORead, OWrite, OSignal, OFunction, OForLoop, OForGenerate, OInstantiation, OMapping, OEntity, OFileWithEntity, OFileWithEntityAndArchitecture, OFileWithPackage, ORecord, ObjectBase, OType, OReadOrMappingName, OWriteReadBase, ORecordChild, OEnum, OProcess, OStatement, OIf, OIfClause, OMap} from './parser/objects';
import { mkdtempSync, writeFile, readFile } from 'fs';
import { tmpdir } from 'os';
import { sep } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { foldingHandler } from './languageFeatures/folding';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
export const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasWorkspaceFolderCapability: boolean = false;
// let hasDiagnosticRelatedInformationCapability: boolean = false;
let projectParser: ProjectParser;

connection.onInitialize((params: InitializeParams) => {
  let capabilities = params.capabilities;
  hasWorkspaceFolderCapability =
    capabilities.workspace && !!capabilities.workspace.workspaceFolders || false;

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
      foldingRangeProvider: true}
  };
});
export const initialization = new Promise(resolve => {
  connection.onInitialized(async () => {
    if (hasWorkspaceFolderCapability) {
      const parseWorkspaces = async () => {
        const workspaceFolders = await connection.workspace.getWorkspaceFolders();
        if (workspaceFolders) {
          const folders = workspaceFolders.map(workspaceFolder => workspaceFolder.uri.replace('file://', ''));
          projectParser = new ProjectParser(folders);
          await projectParser.init();
        }
        documents.all().forEach(validateTextDocument);
        projectParser.events.on('change', (... args) => {
          console.log('projectParser.events.change', new Date().getTime(), ... args);
          documents.all().forEach(validateTextDocument);
        });
        documents.onDidChangeContent(change => {
          console.log('onDidChangeContent', new Date().getTime());
          validateTextDocument(change.document);
        });
      };
      await parseWorkspaces();
      connection.workspace.onDidChangeWorkspaceFolders(async event => {
        projectParser.addFolders(event.added.map(folder => folder.uri.replace('file://', '')));
        connection.console.log('Workspace folder change event received.');
      });
    } else {
      projectParser = new ProjectParser([]);
      await projectParser.init();
    }
    resolve();
  });
});
documents.onDidClose(change => {
  connection.sendDiagnostics({uri: change.document.uri, diagnostics: []});
});
// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
export const linters = new Map<string, VhdlLinter>();
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const vhdlLinter = new VhdlLinter(textDocument.uri.replace('file://', ''), textDocument.getText(), projectParser);
  if (typeof vhdlLinter.tree !== 'undefined') {
    linters.set(textDocument.uri, vhdlLinter);
  }
  const diagnostics: Diagnostic[] = (vhdlLinter.checkAll()).map(message => {
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
  await initialization;
  const linter = linters.get(params.textDocument.uri);
  if (!linter) {
    return [];
  }
  const messages = linter.checkAll();
  const message = messages.find(message => {
    if (typeof message.solutions === 'undefined' || messages.length === 0) {
      return false;
    }
    return message.location.position.start.character === params.context.diagnostics[0].range.start.character &&
      message.location.position.start.line === params.context.diagnostics[0].range.start.line &&
      message.location.position.end.character === params.context.diagnostics[0].range.end.character &&
      message.location.position.end.line === params.context.diagnostics[0].range.end.line;
  });
  if (message && message.solutions) {
    return message.solutions.filter(solution => solution.replaceWith).map(solution => {
      const workspaceEdit: WorkspaceEdit = {};
      const textEdit: TextEdit = TextEdit.replace(solution.position, solution.replaceWith);
      workspaceEdit.changes = {};
      workspaceEdit.changes[params.textDocument.uri] = [textEdit];
      return CodeAction.create(
        solution.title,
        workspaceEdit,
        CodeActionKind.QuickFix
      );
    });
  }
  return [];
});
connection.onDocumentSymbol(async (params): Promise<DocumentSymbol[]> => {
  await initialization;
  const linter = linters.get(params.textDocument.uri);
  if (!linter) {
    return [];
  }
  const parseArchitecture = (architecture: OArchitecture): DocumentSymbol[] => {
    const symbols: DocumentSymbol[] = [];
    symbols.push(... architecture.instantiations.map(instantiation => ({
        name: instantiation.label + ': ' + instantiation.componentName,
        detail: instantiation.label,
        kind: SymbolKind.Object,
        range: instantiation.range.getRange(),
        selectionRange: instantiation.range.getRange()
      })));
    symbols.push(... architecture.processes.map(process => ({
      name: process.label || 'no label',
      detail: process.label,
      kind: SymbolKind.Object,
      range: process.range.getRange(),
      selectionRange: process.range.getRange(),
      children: process.getStates().map(state => ({
        name: state.name,
        kind: SymbolKind.EnumMember,
        range: state.range.getRange(),
        selectionRange: state.range.getRange(),
      }))
    })));
    for (const generate of architecture.generates) {
      symbols.push({
        name: linter.text.split('\n')[generate.range.start.getPosition().line],
        kind: SymbolKind.Enum,
        range: generate.range.getRange(),
        selectionRange: generate.range.getRange(),
        children: parseArchitecture(generate)
      });
    }
    return symbols;
  };
  const returnValue: DocumentSymbol[] = [];

  if (linter.tree instanceof OFileWithPackage) {
    returnValue.push(...linter.tree.package.types.map(type => DocumentSymbol.create(type.name, undefined, SymbolKind.Enum, type.range.getRange(), type.range.getRange())));
    returnValue.push(...linter.tree.package.functions.map(func => DocumentSymbol.create(func.name, undefined, SymbolKind.Function, func.range.getRange(), func.range.getRange())));
    returnValue.push(... linter.tree.package.constants.map(constants => DocumentSymbol.create(constants.name, undefined, SymbolKind.Constant, constants.range.getRange(), constants.range.getRange())));
  }
  if (linter.tree instanceof OFileWithEntityAndArchitecture) {
    returnValue.push(...parseArchitecture(linter.tree.architecture));
  }
  return returnValue;
});
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
  const candidate = candidates[0];
  if (!candidate) {
    return null;
  }

   if (candidate instanceof OInstantiation || candidate instanceof OMapping || candidate instanceof OReadOrMappingName) {
    let instantiation: OInstantiation = candidate instanceof OReadOrMappingName ? candidate.parent.parent : (candidate instanceof OInstantiation ? candidate : candidate.parent);
    const entity = linter.getProjectEntity(instantiation);
    if (!entity) {
      return null;
    }
    if (candidate instanceof OInstantiation) {
      return {
        // originSelectionRange: linter.getPositionFromILine(startI, startI + text.length),
        range: entity.range.getRange(),
        text: entity.getRoot().originalText,
        // targetSelectionRange:  Range.create(Position.create(0, 0), Position.create(0, 0)),
        uri: 'file://' + entity.getRoot().file
      };
    } else {
      let mapping = candidate instanceof OReadOrMappingName ? candidate.parent : candidate;
      const port = entity.ports.find(port => mapping.name.find(read => read.text.toLowerCase() === port.name.toLowerCase()));
      if (!port) {
        return null;
      }
      return {
        // originSelectionRange: linter.getPositionFromILine(startI, startI + text.length),
        range: port.range.getRange(),
        text: entity.getRoot().originalText,
        // targetSelectionRange:  Range.create(Position.create(0, 0), Position.create(0, 0)),
        uri: 'file://' + entity.getRoot().file
      };

    }
  } else if ((candidate instanceof ORead || candidate instanceof OWrite) && linter.tree instanceof OFileWithEntityAndArchitecture) {
    let result: false|ObjectBase;
    result = linter.tree.architecture.findRead(candidate, linter.packages);
    if (typeof result === 'boolean') {
      return null;
    }
    if (result instanceof ORecordChild) {
      result = result.parent;
    }
    return {
      // originSelectionRange: linter.getPositionFromILine(startI, startI + text.length),
      range: result.range.getRange(),
      text: result.getRoot().originalText,
      // targetSelectionRange: position,
      uri: 'file://' + result.getRoot().file
    };
  }
  return null;
};
connection.onHover(async (params, token): Promise<Hover|null> => {
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
connection.onDefinition(async (params): Promise<Location|null> => {
  await initialization;
  return await findDefinition(params);
});
// This handler provides the initial list of the completion items.
connection.onCompletion(async (params: CompletionParams): Promise<CompletionItem[]> => {
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
    const obj = candidates[0];
    if (!obj) {
      return [];
    }

    let parent = obj.parent;
    let counter = 100;
    const completions: CompletionItem[] = [];
    while ((parent instanceof OFile) === false) {
      // console.log(parent instanceof OFile, parent);
      if (parent instanceof OArchitecture) {
        for (const signal of parent.signals) {
          completions.push({ label: signal.name, kind: CompletionItemKind.Variable });
        }
        for (const type of parent.types) {
          completions.push({ label: type.name, kind: CompletionItemKind.TypeParameter });
          if (type instanceof OEnum) {
            completions.push(...type.states.map(state => {
              return {
                label: state.name,
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
          completions.push({ label: port.name, kind: CompletionItemKind.Field });
        }
        for (const port of parent.entity.generics) {
          completions.push({ label: port.name, kind: CompletionItemKind.Constant });
        }
    }
    for (const pkg of linter.packages) {
      const ieee = pkg.parent.file.match(/ieee/i) !== null;
      for (const obj of pkg.getRoot().objectList) {
        if ((obj as any).name) {
          completions.push({
            label: ieee ? (obj as any).name.toLowerCase() : (obj as any).name,
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
  if (candidate instanceof OWriteReadBase) {
    return linter.tree.objectList.filter(obj => obj instanceof OWriteReadBase && obj.text.toLowerCase() === candidate.text.toLowerCase() && obj !== candidate).map(obj => Location.create(params.textDocument.uri, obj.range.getRange()));
  }
  return [];
});
connection.onDocumentFormatting(async (params: DocumentFormattingParams): Promise<TextEdit[]|null> => {
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
    newText: await promisify(readFile)(tmpFile, {encoding: 'utf8'})
  }];
});
connection.onFoldingRanges(foldingHandler);

documents.listen(connection);

// Listen on the connection
connection.listen();
