import { OContext, OContextReference, OFile } from './objects';
import { ParserPosition } from './parser';
import { ParserBase } from './parser-base';

export class ContextReferenceParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: OFile | OContext) {
    super(pos, file);
    this.debug(`start`);
  }

  parse() {
    const prefix = this.consumeToken();
    this.expect('.');
    const suffix = this.consumeToken();
    this.expect(';');
    return new OContextReference(this.parent, prefix.range.copyWithNewEnd(suffix.range.end), prefix.text, suffix.text);
  }
}