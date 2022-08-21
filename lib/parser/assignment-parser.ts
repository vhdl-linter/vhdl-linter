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
    const leftHandSideTokens = [];
    while (leftHandSideNum < this.pos.num) {
      leftHandSideTokens.push(this.pos.lexerTokens[leftHandSideNum]);
      leftHandSideNum++;
    }
    [assignment.reads, assignment.writes] = this.extractReadsOrWrite(assignment, leftHandSideTokens);
    this.consumeToken();
    let rightHandSideNum = this.pos.num;
    let rightHandSideI = this.pos.i;
    const rightHandSide = this.advanceSemicolonToken();
    assignment.reads.push(...this.extractReads(assignment, rightHandSide));
    assignment.range.end.i = this.pos.i;
    this.debug('parse end');
    return assignment;
  }



}
