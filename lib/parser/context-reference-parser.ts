import { OI, ObjectBase, OContext, OName, OFile, OContextReference, ParserError, OIRange } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';

export class ContextReferenceParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: OFile | OContext) {
    super(pos, file);
    this.debug(`start`);
  }

  parse() {
    const startI = this.pos.i;
    let text = '';
    const prefix = this.consumeToken();
    this.expect('.');
    const suffix = this.consumeToken();
    this.expect(';');
    const endI = startI + text.length;
    return new OContextReference(this.parent, prefix.range, prefix.text, suffix.text);
  }
}