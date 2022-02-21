import { OI, ObjectBase, OContext, OName, OFile, OContextReference, OUseClause, ParserError, OIRange } from "./objects";
import { ParserBase } from "./parser-base";

export class UseClauseParser extends ParserBase {
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
    let match = text.match(/([^.]+)\.([^.]+)\.([^.]+)/i);
    if (match) {
      return new OUseClause(this.parent, startI, endI, match[1], match[2], match[3]);
    } else {
      throw new ParserError('use clause does not match xxx.yyy.zzz', new OIRange(this.parent, startI, endI))
    }
  }
}