import { OAssignment, ObjectBase } from './objects';
import { ParserBase, ParserState } from './parser-base';

export class AssignmentParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase) {
    super(state);
    this.debug(`start`);
  }
  parse(): OAssignment {
    this.debug('parse');
    const assignment = new OAssignment(this.parent, this.getToken().range.copyExtendEndOfLine());
    let leftHandSideNum = this.state.pos.num;
    this.findToken(['<=', ':=']);
    const leftHandSideTokens = [];
    while (leftHandSideNum < this.state.pos.num) {
      leftHandSideTokens.push(this.state.pos.lexerTokens[leftHandSideNum]);
      leftHandSideNum++;
    }
    [assignment.reads, assignment.writes] = this.extractReadsOrWrite(assignment, leftHandSideTokens);
    this.consumeToken();
    const rightHandSide = this.advanceSemicolon();
    assignment.reads.push(...this.extractReads(assignment, rightHandSide));
    assignment.range = assignment.range.copyWithNewEnd(this.state.pos.i);
    this.debug('parse end');
    return assignment;
  }



}
