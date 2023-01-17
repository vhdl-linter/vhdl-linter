import { OLexerToken } from '../lexer';
import { ExpressionParser } from './expression-parser';
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
    assignment.postponed = this.maybe('postponed') !== false;
    assignment.label = label;
    let leftHandSideNum = this.state.pos.num;
    this.findToken(['<=', ':=']);
    const leftHandSideTokens = [];
    while (leftHandSideNum < this.state.pos.num) {
      leftHandSideTokens.push(this.state.pos.lexerTokens[leftHandSideNum]);
      leftHandSideNum++;
    }
    const expressionParser = new ExpressionParser(this.state, assignment, leftHandSideTokens);
    [assignment.references, assignment.writes] = expressionParser.parseTarget();


    this.consumeToken();
    assignment.guarded = this.maybe('guarded') !== false;
    if (this.maybe('transport') === false) {
      const [tokens] = this.advanceParenthesisAware([';'], false, false);
      const numInertial = tokens.findIndex(token => token.getLText() === 'inertial');
      if (numInertial > -1) {
        this.advanceParenthesisAware(['inertial'], true, true);
      }
    }
    let rightHandSide, endToken;
    // TODO: Include unaffected
    do {
      [rightHandSide, endToken] = this.advanceParenthesisAware([';', 'when', 'else', 'after', ','], true, true);

      const expressionParser = new ExpressionParser(this.state, assignment, rightHandSide);
      assignment.references.push(...expressionParser.parse());

    } while (endToken.getLText() !== ';');
    assignment.range = assignment.range.copyWithNewEnd(this.state.pos.i);
    this.debug('parse end');
    return assignment;
  }



}
