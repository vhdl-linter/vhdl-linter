import { OLexerToken } from '../lexer';
import { IHasUseClauses } from './interfaces';
import { ObjectBase, OLibraryReference, OReference, OSelectedName, OUseClause } from './objects';
import { ParserBase, ParserState } from './parserBase';

export class UseClauseParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase & IHasUseClauses) {
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
      const [library, packageName, suffix] = tokens as [OLexerToken, OLexerToken, OLexerToken];
      const libRef = new OLibraryReference(this.parent, library);
      const pkgRef = new OSelectedName(this.parent, packageName, [libRef]);

      return new OUseClause(this.parent, libRef, pkgRef, suffix);
    } else {
      // I believe it also possible to `use library_name.all;` to use everything from a library, however, I have no idea what this would accomplish :)
      const [packageName, suffix] = tokens as [OLexerToken, OLexerToken];
      return new OUseClause(this.parent, undefined, new OReference(this.parent, packageName), suffix);

    }
  }
}