import { ObjectBase, ORead, OSubType, ORange } from './objects';
import { ParserBase, ParserState } from './parser-base';

export class SubtypeParser extends ParserBase {
  subtype: OSubType;
  constructor(state: ParserState, private parent: ObjectBase) {
    super(state);
    this.debug(`start`);
    this.subtype = new OSubType(parent, new ORange(parent, this.state.pos.pos, this.state.pos.pos));
  }
  parse() {
    this.expect('subtype');
    this.subtype.lexerToken = this.consumeToken();
    this.expect('is');
    if (this.getToken().getLText() === '(') { // funky vhdl stuff
      this.subtype.resolved = true;
      this.advancePast(')');
    }
    if (this.maybe('resolved')) {
      this.subtype.resolved = true;
    }
    const superType = this.consumeToken();
    this.subtype.range = this.subtype.range.copyWithNewEnd(this.state.pos.pos);
    const tokens = this.advanceSemicolon(true);
    if (tokens.length > 0) {
      this.subtype.range = this.subtype.range.copyWithNewEnd(tokens[tokens.length - 1]!.range);
    }
    // const reads = this.extractReads(this.subtype, this.advanceSemicolon(true), startIReads);
    this.subtype.superType = new ORead(this.subtype, superType);
    return this.subtype;
  }

}