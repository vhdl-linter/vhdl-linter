import { OContext, OContextReference, ObjectBase } from './objects';
import { ParserPosition } from './parser';
import { ParserBase } from './parser-base';

export class ContextReferenceParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: ObjectBase | OContext) {
    super(pos, file);
    this.debug(`start`);
  }

  parse() {
    const prefix = this.consumeToken();
    this.expectToken('.');
    const suffix = this.consumeToken();
    this.expectToken(';');
    return new OContextReference(this.parent, prefix.range.copyWithNewEnd(suffix.range), prefix, suffix.text);
  }
}