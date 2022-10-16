import { OFile, OIRange, OUseClause, ObjectBase } from './objects';
import { ParserPosition } from './parser';
import { ParserBase } from './parser-base';
import { OLexerToken, TokenType } from '../lexer';

export class UseClauseParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: ObjectBase|OFile) {
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

      return new OUseClause(this.parent, new OIRange(this.parent, startI, this.pos.i), library, packageName.text, suffix.text);
    } else {
      const [packageName, suffix] = tokens;
      return new OUseClause(this.parent, new OIRange(this.parent, startI, this.pos.i), new OLexerToken('work', packageName.range, TokenType.keyword), packageName.text, suffix.text);

    }
  }
}