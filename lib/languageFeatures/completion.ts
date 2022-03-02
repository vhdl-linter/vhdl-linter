import { CompletionItem, CompletionItemKind, CompletionParams, InsertTextFormat, Position, Range } from 'vscode-languageserver';
import { documents, initialization, linters, projectParser } from '../language-server';
import { implementsIHasConstants, implementsIHasSignals, implementsIHasSubprograms, implementsIHasTypes, implementsIHasVariables, ORecord, OEnum, OFile, OFileWithEntity, OName } from '../parser/objects';

export async function handleCompletion(params: CompletionParams): Promise<CompletionItem[]> {
  await initialization;
  const completions: CompletionItem[] = [];
  const document = documents.get(params.textDocument.uri);

  if (document) {
    const range = Range.create(Position.create(params.position.line, 0), Position.create(params.position.line + 1, 0));
    const line = document.getText(range);
    let match = line.match(/^(\s*)-*\s*(.*)/)
    if (match) {
      completions.push({
        label: "Block comment",
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
        completions.push({ label: pkg.name.text });
        pkg.library && completions.push({ label: pkg.library });
      }
    }
    completions.push({ label: 'all' });
    completions.push({ label: 'work' });
  }

  let startI = linter.getIFromPosition(params.position);
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
        completions.push({ label: signal.name.text, kind: CompletionItemKind.Variable });
      }
    }
    if (implementsIHasConstants(parent)) {
      for (const constant of parent.constants) {
        completions.push({ label: constant.name.text, kind: CompletionItemKind.Variable });
      }
    }
    if (implementsIHasVariables(parent)) {
      for (const variable of parent.variables) {
        completions.push({ label: variable.name.text, kind: CompletionItemKind.Variable });
      }
    }
    if (implementsIHasSubprograms(parent)) {
      for (const subprogram of parent.subprograms) {
        completions.push({ label: subprogram.name.text, kind: CompletionItemKind.Function });
      }
    }
    if (implementsIHasTypes(parent)) {
      for (const type of parent.types) {
        completions.push({ label: type.name.text, kind: CompletionItemKind.TypeParameter });
        if (type instanceof OEnum) {
          completions.push(...type.literals.map(state => {
            return {
              label: state.name.text,
              kind: CompletionItemKind.EnumMember
            };
          }));
        } else if (type instanceof ORecord) {
          completions.push(...type.children.map(c => {
            return {
              label: c.name.text,
              kind: CompletionItemKind.EnumMember
            }
          }))
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
    for (const signal of parent.entity.signals) {
      completions.push({ label: signal.name.text, kind: CompletionItemKind.Variable });
    }
    for (const constant of parent.entity.constants) {
      completions.push({ label: constant.name.text, kind: CompletionItemKind.Variable });
    }
    for (const variable of parent.entity.variables) {
      completions.push({ label: variable.name.text, kind: CompletionItemKind.Variable });
    }
    for (const subprogram of parent.entity.subprograms) {
      completions.push({ label: subprogram.name.text, kind: CompletionItemKind.Function });
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