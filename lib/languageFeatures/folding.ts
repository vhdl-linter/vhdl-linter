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
  return result;
}

function blockFolding(text: string) {
  const result = [];
  const lines = text.split('\n');

  let blockHeaderStart = undefined;
  let blockHeaderIndent = undefined;
  let blockHeaderStop  = undefined;

  var i = 0;
  while(/^\s*--.*$/.test(lines[i])) {
    i++;
  }
  if (i > 0) {
    result.push(FoldingRange.create(0, i-1, undefined, undefined, 'comment'));
  }
  for (i; i < lines.length; i++) {
    if (blockHeaderStart === undefined) {
      const match = lines[i].match(/^(\s*)----+\s*$/);
      if (match) {
        blockHeaderStart = i;
        blockHeaderIndent = match[1];
        // debugger
      }
      continue;
    }
    if (blockHeaderStop === undefined) {
      const match = lines[i].match(/^(\s*)(--+).*$/);
      if(!match) {
        blockHeaderStart = undefined;
        blockHeaderIndent = undefined;
        continue;
      }
      if (match[2].length > 4 && match[1] === blockHeaderIndent) {
        blockHeaderStop = i;
      }
      continue;
    }

    for(let j=i; j < lines.length; j++) {
      const match = lines[j].match(/^(\s*)----+\s*$/);
      if (!match || match[1] !== blockHeaderIndent) {
        continue;
      }
      // debugger
      result.push(FoldingRange.create(blockHeaderStop-1, j-1, undefined, undefined, 'comment'));
      blockHeaderStart = i;
      blockHeaderStop = undefined;
    }
    blockHeaderStart  = undefined;
    blockHeaderStop   = undefined;
    blockHeaderIndent = undefined;
  }
  return result;
}