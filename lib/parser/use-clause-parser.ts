import { ObjectBase, OLibraryReference, OReference, OUseClause } from './objects';
import { ParserBase, ParserState } from './parser-base';

export class UseClauseParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase) {
    super(state);
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

      return new OUseClause(this.parent, new OLibraryReference(this.parent, library), new OReference(this.parent, packageName), suffix);
    } else {
      // I believe it also possible to `use library_name.all;` to use everything from a library, however, I have no idea what this would accomplish :)
      const [packageName, suffix] = tokens;
      return new OUseClause(this.parent, undefined, new OReference(this.parent, packageName), suffix);

    }
  }
}