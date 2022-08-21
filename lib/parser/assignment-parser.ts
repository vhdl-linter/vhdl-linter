import { OAssignment, ObjectBase, OI, ParserError } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';

export class AssignmentParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: ObjectBase) {
    super(pos, file);
    this.debug(`start`);
  }
  parse(): OAssignment {
    this.debug('parse');
    let assignment = new OAssignment(this.parent, this.pos.i, this.getEndOfLineI());
    let leftHandSideNum = this.pos.num;
    const leftHandSideI = this.pos.i;
    let leftHandSide = '';
    this.findToken(['<=', ':=']);
    while (leftHandSideNum < this.pos.num) {
      leftHandSide += this.pos.lexerTokens[leftHandSideNum].text;
      leftHandSideNum++;
    }
    [assignment.reads, assignment.writes] = this.extractReadsOrWrite(assignment, leftHandSide, leftHandSideI);
    this.consumeToken();
    let rightHandSideNum = this.pos.num;
    let rightHandSideI = this.pos.i;
    const rightHandSide = this.advanceSemicolon();
    assignment.reads.push(...this.extractReads(assignment, rightHandSide, rightHandSideI));
    assignment.range.end.i = this.pos.i;
    this.debug('parse end');
    return assignment;
  }



}
