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
    const tokens = [];
    tokens.push(this.consumeToken());
    this.expect('.');
    tokens.push(this.consumeToken());
    if (this.getToken().getLText() === '.') {
      this.consumeToken();
      tokens.push(this.consumeToken());
      this.expect(';');
    } else {
      this.expect(';');
    }
    if (tokens.length === 3) {
      const [library, packageName, suffix] = tokens;

      return new OUseClause(this.parent, new OIRange(this.parent, startI, this.pos.i), library.text, packageName.text, suffix.text);
    } else {
      const [packageName, suffix] = tokens;
      return new OUseClause(this.parent, new OIRange(this.parent, startI, this.pos.i), 'work', packageName.text, suffix.text);

    }
  }
}