import { OUseClause, ObjectBase } from './objects';
import { ParserPosition } from './parser';
import { ParserBase } from './parser-base';

export class UseClauseParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: ObjectBase) {
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

      return new OUseClause(this.parent, library, packageName, suffix);
    } else {
      // I believe it also possible to `use library_name.all;` to use everything from a library, however, I have no idea what this would accomplish :)
      const [packageName, suffix] = tokens;
      return new OUseClause(this.parent, undefined, packageName, suffix);

    }
  }
}