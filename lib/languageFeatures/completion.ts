import { CompletionItem, CompletionItemKind, CompletionParams, InsertTextFormat, Position, Range, ErrorCodes } from 'vscode-languageserver';
import { documents, initialization, linters, projectParser, connection } from '../language-server';
import { implementsIHasConstants, implementsIHasSignals, implementsIHasSubprograms, implementsIHasTypes, implementsIHasVariables, ORecord, OEnum, OFile, OArchitecture, OEntity, implementsIHasLexerToken, ObjectBase } from '../parser/objects';

export function attachOnCompletion() {
  connection.onCompletion(async (params: CompletionParams, token): Promise<CompletionItem[]> => {
    await initialization;
    if (token.isCancellationRequested) {
      throw ErrorCodes.RequestCancelled;
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
        for (const pkg of projectParser.getPackages()) {
          completions.push({ label: pkg.lexerToken.text });
          pkg.library && completions.push({ label: pkg.library });
        }
      }
      completions.push({ label: 'all' });
      completions.push({ label: 'work' });
    }

    const startI = linter.getIFromPosition(params.position);
    const candidates = linter.file.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i);
    candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
    const obj = candidates[0];
    if (!obj) {
      return completions;
    }

    let parent = obj.parent;
    let counter = 100;
    while ((parent instanceof OFile) === false) {
      // console.log(parent instanceof OFile, parent);
      if (implementsIHasSignals(parent)) {
        for (const signal of parent.signals) {
          completions.push({ label: signal.lexerToken.text, kind: CompletionItemKind.Variable });
        }
      }
      if (implementsIHasConstants(parent)) {
        for (const constant of parent.constants) {
          completions.push({ label: constant.lexerToken.text, kind: CompletionItemKind.Variable });
        }
      }
      if (implementsIHasVariables(parent)) {
        for (const variable of parent.variables) {
          completions.push({ label: variable.lexerToken.text, kind: CompletionItemKind.Variable });
        }
      }
      if (implementsIHasSubprograms(parent)) {
        for (const subprogram of parent.subprograms) {
          completions.push({ label: subprogram.lexerToken.text, kind: CompletionItemKind.Function });
        }
      }
      if (implementsIHasTypes(parent)) {
        for (const type of parent.types) {
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
      if ((parent as ObjectBase).parent instanceof OFile) {
        break;
      }
      parent = (parent as ObjectBase).parent;
      counter--;
      if (counter === 0) {
        //        console.log(parent, parent.parent);
        throw new Error('Infinite Loop?');
      }
    }
    let entity: OEntity | undefined;
    if (parent instanceof OEntity) {
      entity = parent;
    } else if (parent instanceof OArchitecture && parent.correspondingEntity) {
      entity = parent.correspondingEntity;
    }
    if (entity) {
      for (const port of entity.ports) {
        completions.push({ label: port.lexerToken.text, kind: CompletionItemKind.Field });
      }
      for (const port of entity.generics) {
        completions.push({ label: port.lexerToken.text, kind: CompletionItemKind.Constant });
      }
      for (const signal of entity.signals) {
        completions.push({ label: signal.lexerToken.text, kind: CompletionItemKind.Variable });
      }
      for (const constant of entity.constants) {
        completions.push({ label: constant.lexerToken.text, kind: CompletionItemKind.Variable });
      }
      for (const variable of entity.variables) {
        completions.push({ label: variable.lexerToken.text, kind: CompletionItemKind.Variable });
      }
      for (const subprogram of entity.subprograms) {
        completions.push({ label: subprogram.lexerToken.text, kind: CompletionItemKind.Function });
      }
    }
    for (const pkg of linter.packages) {
      const ieee = pkg.parent.file.match(/ieee/i) !== null;
      for (const obj of pkg.getRoot().objectList) {
        if (implementsIHasLexerToken(obj)) {
          completions.push({
            label: ieee ? obj.lexerToken.getLText() : obj.lexerToken.text,
            kind: CompletionItemKind.Text
          });
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
  });
}