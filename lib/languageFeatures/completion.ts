import { CompletionParams, CompletionItem, Position, CompletionItemKind, Range } from 'vscode-languageserver';
import { documents, initialization, linters, projectParser } from '../language-server';
import { OFile, OArchitecture, OEnum, OFileWithEntity, OName } from '../parser/objects';

export async function handleCompletion(params: CompletionParams): Promise<CompletionItem[]> {
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