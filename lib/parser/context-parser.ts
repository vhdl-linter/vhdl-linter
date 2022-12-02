import { ContextReferenceParser } from './context-reference-parser';
import { OContext, OFile, OIRange, OLibrary } from './objects';
import { ParserBase, ParserState } from './parser-base';
import { UseClauseParser } from './use-clause-parser';

export class ContextParser extends ParserBase {
  constructor(state: ParserState, private parent: OFile) {
    super(state);
    this.debug(`start`);
  }

  parse() {
    const context = new OContext(this.parent, new OIRange(this.parent, this.state.pos.i, this.state.pos.i));
    context.lexerToken = this.consumeToken();
    this.expect('is');
    while (this.state.pos.isValid()) {
      const nextToken = this.consumeToken();
      if (nextToken.getLText() === 'end') {
        this.maybe('context');
        this.maybe(context.lexerToken.text);
        context.range = context.range.copyWithNewEnd(this.state.pos.i);
        this.expect(';');
        break;
      } else if (nextToken.getLText() === 'context') {
        const contextReferenceParser = new ContextReferenceParser(this.state, context);
        context.contextReferences.push(contextReferenceParser.parse());
      } else if (nextToken.getLText() === 'library') {
        context.libraries.push(new OLibrary(context, this.consumeToken()));
        this.expect(';');
      } else if (nextToken.getLText() === 'use') {
        const useClauseParser = new UseClauseParser(this.state, context);
        context.useClauses.push(useClauseParser.parse());
      }
    }

    return context;
  }
}