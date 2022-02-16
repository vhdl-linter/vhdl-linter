import { ObjectBase, OI, OName, ORead, OSubType } from './objects';
import { ParserBase } from './parser-base';

export class SubtypeParser extends ParserBase {
  subtype: OSubType;
  constructor(text: string, pos: OI, file: string, private parent: ObjectBase) {
    super(text, pos, file);
    this.debug(`start`);
    this.subtype = new OSubType(parent, this.pos.i, this.pos.i);
  }
  parse() {
    this.expect('subtype');
    const beforeNameText = this.pos.i;
    const nameText = this.getNextWord();
    this.subtype.name = new OName(this.subtype, beforeNameText, beforeNameText + nameText.length);
    this.subtype.name.text = nameText;
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