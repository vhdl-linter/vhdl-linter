import { CompletionItem, CompletionItemKind, CompletionParams, InsertTextFormat, Position, Range, ErrorCodes, CancellationToken } from 'vscode-languageserver';
import { documents, initialization, projectParser } from '../language-server';
import { implementsIHasConstants, implementsIHasSignals, implementsIHasSubprograms, implementsIHasTypes, implementsIHasVariables, ORecord, OEnum, OEntity, scope, ObjectBase, IHasLexerToken } from '../parser/objects';
import { VhdlLinter } from '../vhdl-linter';

export async function getCompletions(linter: VhdlLinter, params: CompletionParams, token: CancellationToken): Promise<CompletionItem[]> {
  await initialization;
  if (token.isCancellationRequested) {
    throw ErrorCodes.PendingResponseRejected;
  }
  
  
  const completions: CompletionItem[] = [];
  const ieeeCasingLowercase = (await linter.settingsGetter(params.textDocument.uri)).style.ieeeCasing === 'lowercase';
  const addCompletion = async (item: ObjectBase & IHasLexerToken, kind?: CompletionItemKind) => {
    const lowercase = item.rootFile.file.match(/ieee2008/) && ieeeCasingLowercase;
    completions.push({ label: lowercase ? item.lexerToken.getLText() : item.lexerToken.text, kind });
  }

  const document = documents.get(params.textDocument.uri);

  if (document) {
    const range = Range.create(Position.create(params.position.line, 0), Position.create(params.position.line + 1, 0));
    const line = document.getText(range);
    const match = line.match(/^(\s*)-*\s*(.*)/);
    if (match) {
      completions.push({
        label: 'Block comment',
        commitCharacters: ['-'],
        insertText: '-'.repeat(80 - match[1].length) + '\n-- ' + match[2] + '${1}\n' + '-'.repeat(80 - match[1].length),
        insertTextFormat: InsertTextFormat.Snippet,
        preselect: true,
        kind: CompletionItemKind.Snippet
      });
    }
  }

  if (document) {
    const line = document.getText(Range.create(Position.create(params.position.line, 0), Position.create(params.position.line + 1, 0)));
    const match = line.match(/^\s*use\s+/i);
    if (match) {
      for (const pkg of projectParser.packages) {
        addCompletion(pkg);
        pkg.targetLibrary && completions.push({ label: pkg.targetLibrary });
      }
    }
    completions.push({ label: 'all' });
    completions.push({ label: 'work' });
  }

  const startI = linter.getIFromPosition(params.position);
  const candidates = linter.file.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i);
  candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
  const completionObject = candidates[0];
  if (!completionObject) {
    return completions;
  }

  for (const [object] of scope(completionObject)) {
    if (implementsIHasSignals(object)) {
      for (const signal of object.signals) {
        addCompletion(signal, CompletionItemKind.Variable);
      }
    }
    if (implementsIHasConstants(object)) {
      for (const constant of object.constants) {
        addCompletion(constant, CompletionItemKind.Variable);
      }
    }
    if (implementsIHasVariables(object)) {
      for (const variable of object.variables) {
        addCompletion(variable, CompletionItemKind.Variable);
      }
    }
    if (implementsIHasSubprograms(object)) {
      for (const subprogram of object.subprograms) {
        addCompletion(subprogram, CompletionItemKind.Function);
      }
    }
    if (implementsIHasTypes(object)) {
      for (const type of object.types) {
        addCompletion(type, CompletionItemKind.TypeParameter);
        if (type instanceof OEnum) {
          for (const literal of type.literals) {
            addCompletion(literal, CompletionItemKind.EnumMember);
          }
        } else if (type instanceof ORecord) {
          for (const chield of type.children) {
            addCompletion(chield, CompletionItemKind.Field);
          }
        }
      }
    }
    if (object instanceof OEntity) {
      for (const port of object.ports) {
        addCompletion(port, CompletionItemKind.Field);
      }
      for (const port of object.generics) {
        addCompletion(port, CompletionItemKind.Constant);
      }
      for (const signal of object.signals) {
        addCompletion(signal, CompletionItemKind.Variable);
      }
      for (const constant of object.constants) {
        addCompletion(constant, CompletionItemKind.Variable);
      }
      for (const variable of object.variables) {
        addCompletion(variable, CompletionItemKind.Variable);
      }
      for (const subprogram of object.subprograms) {
        addCompletion(subprogram, CompletionItemKind.Function);
      }
    }
  }
  const uniqueSet = new Set();
  const completionsUnique: CompletionItem[] = [];
  for (const completion of completions) {
    if (!uniqueSet.has(completion.label.toLowerCase())) {
      completionsUnique.push(completion);
      uniqueSet.add(completion.label.toLowerCase());
    }
  }

  return completionsUnique;
}