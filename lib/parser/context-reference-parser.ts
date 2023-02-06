import { OContext, OContextReference, ObjectBase, OLibraryReference, OFile } from './objects';
import { ParserBase, ParserState } from './parser-base';

export class ContextReferenceParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase | OContext | OFile) {
    super(state);
    this.debug(`start`);
  }

  parse() {
    const prefix = this.consumeToken();
    this.expect('.');
    const suffix = this.consumeToken();
    this.expect(';');
    const contextReference = new OContextReference(this.parent, prefix.range.copyWithNewEnd(suffix.range), suffix.text);
    new OLibraryReference(contextReference, prefix);
    return contextReference;
  }
}