import { connection, documents, initialization, linters} from '../language-server';
import { FoldingRangeParams, FoldingRange } from 'vscode-languageserver';
import { OIfClause, OProcess, OInstantiation, OMap, OEntity, OFileWithEntity, OElseClause, OWhenClause, OCase, OIfGenerateClause, OForGenerate } from '../parser/objects';
import { readFile } from 'fs';
export async function foldingHandler (params: FoldingRangeParams): Promise<FoldingRange[]> {
  await initialization;
  const linter = linters.get(params.textDocument.uri);
  if (typeof linter === 'undefined' || typeof linter.tree === 'undefined') {
    return blockFolding(documents.get(params.textDocument.uri)?.getText() ?? '');
  }
  const result: FoldingRange[] = [];
  for (const obj of linter.tree.objectList) {
    if (obj instanceof OProcess || obj instanceof OIfClause || obj instanceof OInstantiation || obj instanceof OIfGenerateClause || obj instanceof OForGenerate ||
      obj instanceof OMap || obj instanceof OEntity || obj instanceof OElseClause || obj instanceof OCase || obj instanceof OWhenClause) {
      result.push(FoldingRange.create(obj.range.start.line, obj.range.end.line));
    }
  }
  if (linter.tree instanceof OFileWithEntity) {
    if (linter.tree.entity.portRange) {
      result.push(FoldingRange.create(linter.tree.entity.portRange.start.line, linter.tree.entity.portRange.end.line));
    }
    if (linter.tree.entity.genericRange) {
      result.push(FoldingRange.create(linter.tree.entity.genericRange.start.line, linter.tree.entity.genericRange.end.line));
    }
  }
  result.push(...blockFolding(documents.get(params.textDocument.uri)?.getText() ?? ''));



  const match = linter.text.match(/^(\s*--.*\n)*/);
  if (match) {
    result.push(FoldingRange.create(0, match[0].split('\n').length, undefined, undefined, 'comment'));
  }
  return result;
}
function blockFolding(text: string) {
  const result = [];
  let blockStart = undefined;
  const lines = text.split('\n');
  for (let i = 2; i < lines.length; i++) {
    let match: RegExpMatchArray | null = lines[i].match(/^\s*--+\s*/);
    if (blockStart === undefined) {
      if (!/^\s*--+\s*$/.test(lines[i]) || !/^\s*--+[^-]*$/.test(lines[i - 1]) || !/^\s*--+\s*/.test(lines[i - 2])) {
        continue;
      }
      blockStart = i;
      continue;
    }

    if (!/^\s*--+\s*$/.test(lines[i])) {
      continue;
    }

    result.push(FoldingRange.create(blockStart - 1, i - 1, undefined, undefined, 'comment'));
    blockStart = undefined;
  }
  return result;
}