import { ParserBase } from './parser-base';
import { OI, ObjectBase, OSubType, ORead } from './objects';

export class SubtypeParser extends ParserBase {
  subtype: OSubType;
  constructor(text: string, pos: OI, file: string, private parent: ObjectBase) {
    super(text, pos, file);
    this.debug(`start`);
    this.subtype = new OSubType(parent, this.pos.i, this.pos.i);
  }
  parse() {
    this.expect('subtype');
    const name = this.getNextWord();
    this.subtype.name = name;
    this.expect('is');
    if (this.text[this.pos.i] === '(') { // funky vhdl stuff
      this.advancePast(')');
    }
    const startISuperType = this.pos.i;
    const superType = this.getNextWord();
    const startIReads = this.pos.i;
    this.advanceSemicolon(true);
    // const reads = this.extractReads(this.subtype, this.advanceSemicolon(true), startIReads);
    this.subtype.superType = new ORead(this.subtype, startISuperType, startISuperType + superType.length, superType);
    return this.subtype;
  }

}