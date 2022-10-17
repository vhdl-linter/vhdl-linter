import { OFile, OUseClause, ObjectBase } from './objects';
import { ParserPosition } from './parser';
import { ParserBase } from './parser-base';

export class UseClauseParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: ObjectBase|OFile) {
    super(pos, file);
    this.debug(`start`);
  }

  parse() {
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

      return new OUseClause(this.parent, library.range.copyWithNewEnd(suffix.range), library, packageName, suffix);
    } else {
      const [packageName, suffix] = tokens;
      return new OUseClause(this.parent, packageName.range.copyWithNewEnd(suffix.range), undefined, packageName, suffix);

    }
  }
}