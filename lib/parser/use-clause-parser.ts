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
    this.expectToken('.');
    tokens.push(this.consumeToken());
    if (this.getToken().getLText() === '.') {
      this.consumeToken();
      tokens.push(this.consumeToken());
      this.expectToken(';');
    } else {
      this.expectToken(';');
    }
    if (tokens.length === 3) {
      const [library, packageName, suffix] = tokens;

      return new OUseClause(this.parent, library.range.copyWithNewEnd(suffix.range), library, packageName, suffix);
    } else {
      // I believe it also possible to `use library_name.all;` to use everything from a library, however, I have no idea what this would accomplish :)
      const [packageName, suffix] = tokens;
      return new OUseClause(this.parent, packageName.range.copyWithNewEnd(suffix.range), undefined, packageName, suffix);

    }
  }
}