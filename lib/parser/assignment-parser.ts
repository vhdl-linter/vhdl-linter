import { OLexerToken } from '../lexer';
import { OAssignment, ObjectBase } from './objects';
import { ParserBase, ParserState } from './parser-base';

export class AssignmentParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase) {
    super(state);
    this.debug(`start`);
  }
  parse(label?: OLexerToken): OAssignment {
    this.debug('parse');
    const assignment = new OAssignment(this.parent, this.getToken().range.copyExtendEndOfLine());
    assignment.label = label;
    let leftHandSideNum = this.state.pos.num;
    this.findToken(['<=', ':=']);
    const leftHandSideTokens = [];
    while (leftHandSideNum < this.state.pos.num) {
      leftHandSideTokens.push(this.state.pos.lexerTokens[leftHandSideNum]);
      leftHandSideNum++;
    }
    [assignment.labelReferences, assignment.writes] = this.extractReadsOrWrite(assignment, leftHandSideTokens);
    this.consumeToken();
    const rightHandSide = this.advanceSemicolon();
    assignment.labelReferences.push(...this.parseExpression(assignment, rightHandSide));
    assignment.range = assignment.range.copyWithNewEnd(this.state.pos.i);
    this.debug('parse end');
    return assignment;
  }



}
