import { CompletionItem, CompletionItemKind, CompletionParams, InsertTextFormat, Position, Range, ErrorCodes } from 'vscode-languageserver';
import { documents, initialization, linters, projectParser, connection } from '../language-server';
import { implementsIHasConstants, implementsIHasSignals, implementsIHasSubprograms, implementsIHasTypes, implementsIHasVariables, ORecord, OEnum, OEntity, scope } from '../parser/objects';

export function attachOnCompletion() {
  connection.onCompletion(async (params: CompletionParams, token): Promise<CompletionItem[]> => {
    await initialization;
    if (token.isCancellationRequested) {
      throw ErrorCodes.PendingResponseRejected;
    }
    const completions: CompletionItem[] = [];
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

    const linter = linters.get(params.textDocument.uri);
    if (typeof linter === 'undefined') {
      return completions;
    }
    if (typeof linter.file === 'undefined') {
      return completions;
    }
    if (document) {
      const line = document.getText(Range.create(Position.create(params.position.line, 0), Position.create(params.position.line + 1, 0)));
      const match = line.match(/^\s*use\s+/i);
      if (match) {
        for (const pkg of projectParser.packages) {
          completions.push({ label: pkg.lexerToken.text });
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
          completions.push({ label: signal.lexerToken.text, kind: CompletionItemKind.Variable });
        }
      }
      if (implementsIHasConstants(object)) {
        for (const constant of object.constants) {
          completions.push({ label: constant.lexerToken.text, kind: CompletionItemKind.Variable });
        }
      }
      if (implementsIHasVariables(object)) {
        for (const variable of object.variables) {
          completions.push({ label: variable.lexerToken.text, kind: CompletionItemKind.Variable });
        }
      }
      if (implementsIHasSubprograms(object)) {
        for (const subprogram of object.subprograms) {
          completions.push({ label: subprogram.lexerToken.text, kind: CompletionItemKind.Function });
        }
      }
      if (implementsIHasTypes(object)) {
        for (const type of object.types) {
          completions.push({ label: type.lexerToken.text, kind: CompletionItemKind.TypeParameter });
          if (type instanceof OEnum) {
            completions.push(...type.literals.map(state => {
              return {
                label: state.lexerToken.text,
                kind: CompletionItemKind.EnumMember
              };
            }));
          } else if (type instanceof ORecord) {
            completions.push(...type.children.map(c => {
              return {
                label: c.lexerToken.text,
                kind: CompletionItemKind.EnumMember
              };
            }));
          }
        }
      }
      if (object instanceof OEntity) {
        for (const port of object.ports) {
          completions.push({ label: port.lexerToken.text, kind: CompletionItemKind.Field });
        }
        for (const port of object.generics) {
          completions.push({ label: port.lexerToken.text, kind: CompletionItemKind.Constant });
        }
        for (const signal of object.signals) {
          completions.push({ label: signal.lexerToken.text, kind: CompletionItemKind.Variable });
        }
        for (const constant of object.constants) {
          completions.push({ label: constant.lexerToken.text, kind: CompletionItemKind.Variable });
        }
        for (const variable of object.variables) {
          completions.push({ label: variable.lexerToken.text, kind: CompletionItemKind.Variable });
        }
        for (const subprogram of object.subprograms) {
          completions.push({ label: subprogram.lexerToken.text, kind: CompletionItemKind.Function });
        }
      }
      // if (implementsIHasUseClause(parent)) {
      //   for (const pkg of linter.getPackages(parent)) {
      //     const ieee = pkg.parent.file.match(/ieee/i) !== null;
      //     for (const obj of pkg.getRoot().objectList) {
      //       if (implementsIHasLexerToken(obj)) {
      //         completions.push({
      //           label: ieee ? obj.lexerToken.getLText() : obj.lexerToken.text,
      //           kind: CompletionItemKind.Text
      //         });
      //       }
      //     }
      //   }
      // }
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
  });
}