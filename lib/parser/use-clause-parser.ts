import { OI, ObjectBase, OContext, OName, OFile, OContextReference, OUseClause, ParserError, OIRange } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';

export class UseClauseParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: OFile|OContext) {
    super(pos, file);
    this.debug(`start`);
  }

  parse() {
    const startI = this.pos.i;
    const library = this.consumeToken();
    this.expect('.');
    const packageName = this.consumeToken();
    this.expect('.');
    const suffix = this.consumeToken();
    this.expect(';');

    return new OUseClause(this.parent, startI, this.pos.i, library.text, packageName.text, suffix.text);
  }
}