import { ContextReferenceParser } from './context-reference-parser';
import { OContext, OFile, OIRange, OLibrary } from './objects';
import { ParserPosition } from './parser';
import { ParserBase } from './parser-base';
import { UseClauseParser } from './use-clause-parser';

export class ContextParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: OFile) {
    super(pos, file);
    this.debug(`start`);
  }

  parse() {
    const context = new OContext(this.parent, new OIRange(this.parent, this.pos.i, this.pos.i));
    context.lexerToken = this.consumeToken();
    this.expect('is');
    while (this.pos.isValid()) {
      const nextToken = this.consumeToken();
      if (nextToken.getLText() === 'end') {
        this.maybeWord('context');
        this.maybeWord(context.lexerToken.text);
        context.range = context.range.copyWithNewEnd(this.pos.i);
        this.expect(';');
        break;
      } else if (nextToken.getLText() === 'context') {
        const contextReferenceParser = new ContextReferenceParser(this.pos, this.filePath, context);
        context.contextReferences.push(contextReferenceParser.parse());
      } else if (nextToken.getLText() === 'library') {
        context.libraries.push(new OLibrary(context, this.consumeToken()));
        this.expect(';');
      } else if (nextToken.getLText() === 'use') {
        const useClauseParser = new UseClauseParser(this.pos, this.filePath, context);
        context.useClauses.push(useClauseParser.parse());
      }
    }

    return context;
  }
}