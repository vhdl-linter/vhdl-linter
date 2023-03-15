import { ObjectBase, OSubType, OIRange } from './objects';
import { ParserBase, ParserState } from './parserBase';
import { SubtypeIndicationParser } from './subtypeIndicationParser';

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
    this.subtype.subtypeIndication = new SubtypeIndicationParser(this.state, this.subtype).parse();
    this.expect(';');
    return this.subtype;
  }

}