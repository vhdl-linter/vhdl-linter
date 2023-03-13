import { ExpressionParser } from './expressionParser';
import { ObjectBase, OSubType, OIRange } from './objects';
import { ParserBase, ParserState } from './parserBase';

export class SubtypeParser extends ParserBase {
  subtype: OSubType;
  constructor(state: ParserState, private parent: ObjectBase) {
    super(state);
    this.debug(`start`);
    this.subtype = new OSubType(parent, new OIRange(parent, this.state.pos.i, this.state.pos.i));
  }
  parse() {
    this.expect('subtype');
    this.subtype.lexerToken = this.consumeToken();
    this.expect('is');
    if (this.getToken().getLText() === '(') { // funky vhdl stuff
      this.subtype.resolved = true;
      this.consumeToken(); // consume the '(' to be able to parseParenthesisAware
      this.advanceParenthesisAware([')']);
    }
    if (this.maybe('resolved')) {
      this.subtype.resolved = true;
    }
    const tokens = this.advanceSemicolon(true);
    if (tokens.length > 0) {
      this.subtype.typeNames = new ExpressionParser(this.state, this.subtype, tokens).parse();
      this.subtype.range = this.subtype.range.copyWithNewEnd(tokens.at(-1)!.range);
    } else {
      this.state.messages.push({
        message: 'subtype indication expected',
        range: this.subtype.range
      });
    }
    return this.subtype;
  }

}