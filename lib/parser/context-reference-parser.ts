import { OI, ObjectBase, OContext, OName, OFile, OContextReference, ParserError, OIRange } from "./objects";
import { ParserBase } from "./parser-base";

export class ContextReferenceParser extends ParserBase {
  constructor(text: string, pos: OI, file: string, private parent: OFile|OContext) {
    super(text, pos, file);
    this.debug(`start`);
  }

  parse() {
    const startI = this.pos.i;
    let text = '';
    while (this.text[this.pos.i].match(/[\w.]/)) {
      text += this.text[this.pos.i];
      this.pos.i++;
    }
    this.advanceWhitespace();
    this.expect(';');

    const endI = startI + text.length;
    let match = text.match(/([^.]+)\.([^.]+)/i);
    if (match) {
      return new OContextReference(this.parent, startI, endI, match[1], match[2]);
    } else {
      throw new ParserError('context reference does not match xxx.yyy.zzz', new OIRange(this.parent, startI, endI))
    }
  }
}