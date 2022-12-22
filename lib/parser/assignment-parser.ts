import { OLexerToken } from '../lexer';
import { ExpressionParser } from './expression-parser';
import { OAssignment, ObjectBase, OReference, OWrite, ParserError } from './objects';
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
    const expressionParser = new ExpressionParser(assignment, leftHandSideTokens);
    let leftHandSideReferences: OReference[] = [];
    try {
      leftHandSideReferences = expressionParser.parseTarget();
    } catch(err) {
      if (err instanceof ParserError) {
        this.state.messages.push(err);
      } else {
        throw err;
      }
    }
    assignment.references = leftHandSideReferences.slice(1);
    assignment.writes = leftHandSideReferences.slice(0, 1).map(a => {
      Object.setPrototypeOf(a, OWrite.prototype);
      (a as OWrite).type = 'OWrite';
      return a as OWrite;
    });

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

      const expressionParser = new ExpressionParser(assignment, rightHandSide);
      try {
        assignment.references.push(...expressionParser.parse());
      } catch (err) {
        if (err instanceof ParserError) {
          this.state.messages.push(err);
        } else {
          throw err;
        }
      }

    } while (endToken.getLText() !== ';');
    assignment.range = assignment.range.copyWithNewEnd(this.state.pos.i);
    this.debug('parse end');
    return assignment;
  }



}
