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
  Hover
} from 'vscode-languageserver';
import { VhdlLinter } from './vhdl-linter';
import { ProjectParser} from './project-parser';
import { OFile, OArchitecture, ORead, OWrite, OSignal, OFunction, OForLoop, OForGenerate, OInstantiation, OMapping, OEntity, OFileWithEntity, OFileWithEntityAndArchitecture, OFileWithPackage, OEnum, ObjectBase, OType, OReadOrMappingName} from './parser/objects';
import { readFileSync } from 'fs';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

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
        resolveProvider: true
      },
      documentSymbolProvider: true,
      definitionProvider: true,
      hoverProvider: true
    }
  };
});
const initialization = new Promise(resolve => {
  connection.onInitialized(async () => {
    if (hasWorkspaceFolderCapability) {
      const parseWorkspaces = async () => {
        const workspaceFolders = await connection.workspace.getWorkspaceFolders();
        if (workspaceFolders) {
          const folders = workspaceFolders.map(workspaceFolder => workspaceFolder.uri);
          projectParser = new ProjectParser(folders);
        }
        documents.all().forEach(validateTextDocument);
        documents.onDidChangeContent(change => {
          validateTextDocument(change.document);
        });
      };
      parseWorkspaces();
      connection.workspace.onDidChangeWorkspaceFolders(async event => {
        projectParser.addFolders(event.added.map(folder => folder.uri));
        connection.console.log('Workspace folder change event received.');
      });
    } else {
      projectParser = new ProjectParser([]);
    }
  });
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
const linters = new Map<string, VhdlLinter>();
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const vhdlLinter = new VhdlLinter(textDocument.uri, textDocument.getText(), projectParser);
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
      children: (architecture.signals as (OSignal|OType)[]).concat(architecture.types).map(signal => ({
        name: signal.name,
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
  const returnValue: DocumentSymbol[] = [];
  if (linter.tree instanceof OFileWithEntity) {
    returnValue.push({
      name: 'generics',
      kind: SymbolKind.Class,
      range: linter.getPositionFromILine(linter.tree.entity.startI),
      selectionRange: linter.getPositionFromILine(linter.tree.entity.startI, linter.tree.entity.endI),
      children: linter.tree.entity.generics.map(generic => DocumentSymbol.create(generic.name, undefined, SymbolKind.Variable, linter.getPositionFromILine(generic.startI, generic.endI), linter.getPositionFromILine(generic.startI, generic.endI)))
    });
    returnValue.push({
      name: 'ports',
      kind: SymbolKind.Class,
      range: linter.getPositionFromILine(linter.tree.entity.startI),
      selectionRange: linter.getPositionFromILine(linter.tree.entity.startI, linter.tree.entity.endI),
      children: linter.tree.entity.ports.map(port => DocumentSymbol.create(port.name, undefined, SymbolKind.Variable, linter.getPositionFromILine(port.startI, port.endI), linter.getPositionFromILine(port.startI, port.endI)))
    });
  }
  if (linter.tree instanceof OFileWithPackage) {
    returnValue.push(...linter.tree.package.types.map(type => DocumentSymbol.create(type.name, undefined, SymbolKind.Enum, linter.getPositionFromILine(type.startI, type.endI), linter.getPositionFromILine(type.startI, type.endI))));
    returnValue.push(...linter.tree.package.functions.map(func => DocumentSymbol.create(func.name, undefined, SymbolKind.Function, linter.getPositionFromILine(func.startI, func.endI), linter.getPositionFromILine(func.startI, func.endI))));
    returnValue.push(... linter.tree.package.constants.map(constants => DocumentSymbol.create(constants.name, undefined, SymbolKind.Constant, linter.getPositionFromILine(constants.startI, constants.endI), linter.getPositionFromILine(constants.startI, constants.endI))));
  }
  if (linter.tree instanceof OFileWithEntityAndArchitecture) {
    returnValue.push(...parseArchitecture(linter.tree.architecture));
  }
  return returnValue;
});
const positionFromI = (text: string, i: number) => {
  const slice = text.substring(0, i + 1);
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
  const candidates = linter.tree.objectList.filter(object => object.startI <= startI && startI <= object.endI);
  candidates.sort((a, b) => (a.endI - a.startI) - (b.endI - b.startI));
  const candidate = candidates[0];
  if (!candidate) {
    return null;
  }

   if (candidate instanceof OInstantiation || candidate instanceof OMapping || candidate instanceof OReadOrMappingName) {
    let instantiation: OInstantiation = candidate instanceof OReadOrMappingName ? candidate.parent.parent : (candidate instanceof OInstantiation ? candidate : candidate.parent);
    const entities = linter.projectParser.getEntities().filter((entity: OEntity) => {
      return entity.name.toLowerCase() === instantiation.componentName.toLowerCase() && ((entity.library && instantiation.library) ? entity.library.toLowerCase() === instantiation.library.toLowerCase() : true);
    });
    if (entities.length === 0) {
      return null;
    }
    const entity = entities[0];
    if (candidate instanceof OInstantiation) {
      return {
        // originSelectionRange: linter.getPositionFromILine(startI, startI + text.length),
        range: Range.create(positionFromI(entity.getRoot().text, entity.startI), positionFromI(entity.getRoot().text, entity.endI)),
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
        range: Range.create(positionFromI(entity.getRoot().text, port.startI), positionFromI(entity.getRoot().text, port.endI)),
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
    const position = Range.create(positionFromI(result.getRoot().originalText, result.startI), positionFromI(result.getRoot().originalText, result.endI));
    return {
      // originSelectionRange: linter.getPositionFromILine(startI, startI + text.length),
      range: position,
      text: result.getRoot().originalText,
      // targetSelectionRange: position,
      uri: 'file://' + result.getRoot().file
    };
  }
  return null;
};
connection.onHover(async (params): Promise<Hover|null> => {
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
  return await findDefinition(params);
});
// This handler provides the initial list of the completion items.
connection.onCompletion(
  (params: CompletionParams): CompletionItem[] => {
    const linter = linters.get(params.textDocument.uri);
    if (typeof linter === 'undefined') {
      return [];
    }
    if (typeof linter.tree === 'undefined') {
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
      // console.log(parent instanceof OFile, parent);
      if (parent instanceof OArchitecture) {
        for (const signal of parent.signals) {
          candidates.push({ label: signal.name, kind: CompletionItemKind.Variable });
        }
        for (const type of parent.types) {
          candidates.push({ label: type.name, kind: CompletionItemKind.TypeParameter });
          if (type instanceof OEnum) {
            candidates.push(...type.states.map(state => {
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
          candidates.push({ label: port.name, kind: CompletionItemKind.Field });
        }
        for (const port of parent.entity.generics) {
          candidates.push({ label: port.name, kind: CompletionItemKind.Constant });
        }
    }
    for (const pkg of linter.packages) {
      const ieee = pkg.parent.file.match(/ieee/i) !== null;
      for (const obj of pkg.getRoot().objectList) {
        if ((obj as any).name) {
          candidates.push({
            label: ieee ? (obj as any).name.toLowerCase() : (obj as any).name,
            kind: CompletionItemKind.Text
          });
        }
      }
    }
    const candidatesUnique = candidates.filter((candidate, candidateI) =>
      candidates.slice(0, candidateI).findIndex(candidateFind => candidate.label.toLowerCase() === candidateFind.label.toLowerCase()) === -1
    );
    return candidatesUnique;
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


documents.listen(connection);

// Listen on the connection
connection.listen();
