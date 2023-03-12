import { ContextReferenceParser } from './contextReferenceParser';
import { OContext, OFile, OLibrary } from './objects';
import { ParserBase, ParserState } from './parserBase';
import { UseClauseParser } from './useClauseParser';

export class ContextParser extends ParserBase {
  constructor(state: ParserState, private parent: OFile) {
    super(state);
    this.debug(`start`);
  }

  parse() {
    const context = new OContext(this.parent, this.getToken(-1, true).range);
    context.lexerToken = this.consumeToken();
    this.expect('is');
    while (this.state.pos.isValid()) {
      const nextToken = this.getToken();
      if (nextToken.getLText() === 'end') {
        this.consumeToken();
        this.maybe('context');
        this.maybe(context.lexerToken.text);
        context.range = context.range.copyWithNewEnd(this.state.pos.i);
        this.expect(';');
        break;
      } else if (nextToken.getLText() === 'context') {
        this.consumeToken();
        const contextReferenceParser = new ContextReferenceParser(this.state, context);
        context.contextReferences.push(contextReferenceParser.parse());
      } else if (nextToken.getLText() === 'library') {
        this.consumeToken();
        context.libraries.push(new OLibrary(context, this.consumeToken()));
        this.expect(';');
      } else if (nextToken.getLText() === 'use') {
        const useClauseParser = new UseClauseParser(this.state, context);
        context.useClauses.push(useClauseParser.parse());
      } else {
        const tokens = this.advanceSemicolon();

        this.state.messages.push({
          message: `Unexpected token ${nextToken.text} in context reference.`,
          range: nextToken.range.copyWithNewEnd(tokens.at(-1)!.range)
        });
      }
    }

    return context;
  }
}