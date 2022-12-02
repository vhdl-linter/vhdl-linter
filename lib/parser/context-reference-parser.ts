import { OContext, OContextReference, ObjectBase } from './objects';
import { ParserBase, ParserState } from './parser-base';

export class ContextReferenceParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase | OContext) {
    super(state);
    this.debug(`start`);
  }

  parse() {
    const prefix = this.consumeToken();
    this.expect('.');
    const suffix = this.consumeToken();
    this.expect(';');
    return new OContextReference(this.parent, prefix.range.copyWithNewEnd(suffix.range), prefix, suffix.text);
  }
}