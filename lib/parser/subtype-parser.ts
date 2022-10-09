import { ObjectBase, OI, OName, ORead, OSubType, OIRange } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';

export class SubtypeParser extends ParserBase {
  subtype: OSubType;
  constructor(pos: ParserPosition, file: string, private parent: ObjectBase) {
    super(pos, file);
    this.debug(`start`);
    this.subtype = new OSubType(parent, new OIRange(parent, this.pos.i, this.pos.i));
  }
  parse() {
    this.expect('subtype');
    const beforeNameText = this.pos.i;
    const nameText = this.consumeToken();
    this.subtype.name = new OName(this.subtype, nameText.range);
    this.subtype.name.text = nameText.text;
    this.expect('is');
    if (this.getToken().getLText() === '(') { // funky vhdl stuff
      this.advancePast(')');
    }
    const startISuperType = this.pos.i;
    const superType = this.consumeToken();
    this.subtype.range.end.i = this.pos.i;
    const tokens = this.advanceSemicolonToken(true);
    if (tokens.length > 0) {
      this.subtype.range.end.i = tokens[tokens.length - 1].range.end.i;
    }
    // const reads = this.extractReads(this.subtype, this.advanceSemicolon(true), startIReads);
    this.subtype.superType = new ORead(this.subtype, superType.range, superType.text);
    return this.subtype;
  }

}