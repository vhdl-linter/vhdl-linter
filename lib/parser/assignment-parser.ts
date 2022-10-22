import { OAssignment, ObjectBase } from './objects';
import { ParserPosition } from './parser';
import { ParserBase } from './parser-base';

export class AssignmentParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: ObjectBase) {
    super(pos, file);
    this.debug(`start`);
  }
  parse(): OAssignment {
    this.debug('parse');
    const assignment = new OAssignment(this.parent, this.getToken().range.copyExtendEndOfLine());
    let leftHandSideNum = this.pos.num;
    this.findToken(['<=', ':=']);
    const leftHandSideTokens = [];
    while (leftHandSideNum < this.pos.num) {
      leftHandSideTokens.push(this.pos.lexerTokens[leftHandSideNum]);
      leftHandSideNum++;
    }
    [assignment.reads, assignment.writes] = this.extractReadsOrWrite(assignment, leftHandSideTokens);
    this.consumeToken();
    const rightHandSide = this.advanceSemicolon();
    assignment.reads.push(...this.extractReads(assignment, rightHandSide));
    assignment.range = assignment.range.copyWithNewEnd(this.pos.i);
    this.debug('parse end');
    return assignment;
  }



}
