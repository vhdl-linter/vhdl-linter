import { ContextReferenceParser } from './context-reference-parser';
import { OContext, OFile, OIRange } from './objects';
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
      const nextWord = this.getNextWord();
      if (nextWord === 'end') {
        this.maybeWord('context');
        this.maybeWord(context.lexerToken.text);
        context.range = context.range.copyWithNewEnd(this.pos.i);
        this.expect(';');
        break;
      } else if (nextWord === 'context') {
          const contextReferenceParser = new ContextReferenceParser(this.pos, this.filePath, this.parent);
          context.contextReferences.push(contextReferenceParser.parse());
      } else if (nextWord === 'library') {
        context.libraries.push(this.getNextWord());
        this.expect(';');
      } else if (nextWord === 'use') {
        const useClauseParser = new UseClauseParser(this.pos, this.filePath, this.parent);
        context.useClauses.push(useClauseParser.parse());
      }
    }

    return context;
  }
}