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
  const result: FoldingRange[] = [];
  const indent2divider = new Map();
  const indent2compactDivider = new Map();
  const foldBlock : [number,number][] = [];
  const foldCompact : [number,number][] = [];
  let indentBlockHeader : number|undefined = undefined;
  text.split('\n').forEach((line,index) => {
    const match = line.match(/^(\s*)(-*)(\s*[^-]*\s*)(-*)/);
    if (match) {
      const indent    = match[1]?.length ?? 0;
      const isComment = match[2]?.length >= 2;
      const isDivider = match[2]?.length >= 4 && match[3]?.length === 0 && match[4]?.length === 0;
      const isCompact = match[2]?.length >= 3 && match[3]?.length !== 0 && match[4]?.length >= 3;
      if (isDivider) {
        if (indentBlockHeader === indent) {
          foldBlock.push([indent,index-1])
          indentBlockHeader = undefined;
        } else {
          const dividers = indent2divider.get(indent) ?? []
          dividers.push(index);
          indent2divider.set(indent,dividers);

          const compactDividers = indent2compactDivider.get(indent) ?? []
          compactDividers.push(index);
          indent2compactDivider.set(indent,compactDividers);

          indentBlockHeader = indent;
        }
      } else if (isCompact) {
        foldCompact.push([indent,index])
        const compactDividers = indent2compactDivider.get(indent) ?? []
        compactDividers.push(index);
        indent2compactDivider.set(indent, compactDividers);
      } else if (!isComment) {
        indentBlockHeader = undefined;
      }
    }
  });
  foldCompact.forEach((compact) => {
    const [indent,index] = compact;
    let nextDivider = indent2compactDivider.get(indent).shift(); 
    while(nextDivider <= index) {
      nextDivider = indent2compactDivider.get(indent).shift();
    }
    if (nextDivider !== undefined) {
      result.push(FoldingRange.create(index, nextDivider-1, undefined, undefined, 'comment'));
    }
  });

  foldBlock.forEach((block) => {
    const [indent,index] = block;
    let nextDivider = indent2divider.get(indent).shift(); 
    while(nextDivider <= index) {
      nextDivider = indent2divider.get(indent).shift();
    }
    if (nextDivider !== undefined) {
      result.push(FoldingRange.create(index, nextDivider-1, undefined, undefined, 'comment'));
    }
  });
  return result;
}