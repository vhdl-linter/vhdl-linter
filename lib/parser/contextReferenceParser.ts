import { ObjectBase, OContext, OContextReference, OFile } from './objects';
import { ParserBase, ParserState } from './parserBase';

export class ContextReferenceParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase | OContext | OFile) {
    super(state);
    this.debug(`start`);
  }

  parse() {
    const contextReference = new OContextReference(this.parent, this.getToken().range);
    contextReference.reference = this.advanceSelectedName(contextReference);
    if (contextReference.reference.length > 0) {
      contextReference.range = contextReference.reference[0]!.range.copyWithNewEnd(contextReference.reference[contextReference.reference.length - 1]!.range);
    }
    if (contextReference.reference.length !== 2) {
      this.state.messages.push({
        message: `context reference should be a selected name with length 2 (library.context) but got ${contextReference.reference.length}.`,
        range: contextReference.range
      });
    }
    this.expect(';');
    return contextReference;
  }
}