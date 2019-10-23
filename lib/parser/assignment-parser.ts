import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position';
import {OAssignment, ParserError, ObjectBase} from './objects';

export class AssignmentParser extends ParserBase {
  constructor(text: string, pos: ParserPosition, file: string, private parent: ObjectBase) {
    super(text, pos, file);
    this.debug(`start`);
  }
  parse(): OAssignment {
    let assignment = new OAssignment(this.parent, this.pos.i, this.getEndOfLineI());
    let leftHandSideI = this.pos.i;
    let leftHandSide = '';
    const match = /[<:]/.exec(this.text.substring(this.pos.i));
    if (!match) {
      throw new ParserError(`expected <= or :=, reached end of text. Start on line: ${this.getLine(leftHandSideI)}`, leftHandSideI);
    }
    leftHandSide += this.text.substring(this.pos.i, this.pos.i + match.index);
    this.pos.i += match.index;
    [assignment.reads, assignment.writes] = this.extractReadsOrWrite(assignment, leftHandSide, leftHandSideI);
    this.pos.i += 2;
    let rightHandSideI = this.pos.i;
    const rightHandSide = this.advanceSemicolon();
    assignment.reads.push(...this.extractReads(assignment, rightHandSide, rightHandSideI));
    assignment.endI = this.pos.i;
    return assignment;
  }



}
