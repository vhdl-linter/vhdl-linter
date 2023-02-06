import { OLexerToken } from '../lexer';
import { ExpressionParser } from './expression-parser';
import { OAssignment, ObjectBase } from './objects';
import { ParserBase, ParserState } from './parser-base';

export class AssignmentParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase) {
    super(state);
    this.debug(`start`);
  }
  parse(mode: 'concurrent' | 'sequential', label?: OLexerToken): OAssignment {
    this.debug('parse');

    const assignment = new OAssignment(this.parent, this.getToken().range.copyExtendEndOfLine());
    assignment.postponed = this.maybe('postponed') !== undefined;
    assignment.label = label;
    let leftHandSideNum = this.state.pos.num;
    this.findToken(['<=', ':=']);
    const leftHandSideTokens = [];
    while (leftHandSideNum < this.state.pos.num) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      leftHandSideTokens.push(this.state.pos.lexerTokens[leftHandSideNum]!);
      leftHandSideNum++;
    }
    const expressionParser = new ExpressionParser(this.state, assignment, leftHandSideTokens);
    [assignment.references, assignment.writes] = expressionParser.parseTarget();


    this.consumeToken();
    const forceToken = this.maybe('force');
    if (forceToken) { // 10.5.1
      if (mode !== 'sequential') {
        this.state.messages.push({
          message: 'force only allowed in sequential statement',
          range: forceToken.range
        });
      }
      this.maybe(['in', 'out']);
      const [rightHandSide] = this.advanceParenthesisAware([';'], true, true);
      const expressionParser = new ExpressionParser(this.state, assignment, rightHandSide);
      assignment.references.push(...expressionParser.parse());
      assignment.range = assignment.range.copyWithNewEnd(this.state.pos.i);
      this.debug('parse end');
      return assignment;
    }
    const releaseToken = this.maybe('release');
    if (releaseToken) { // 10.5.1
      if (mode !== 'sequential') {
        this.state.messages.push({
          message: 'force only allowed in sequential statement',
          range: releaseToken.range
        });
      }
      this.maybe(['in', 'out']);
      this.expect(';');
      return assignment;
    }
    const guardedToken = this.maybe('guarded'); // 11.6
    assignment.guarded = guardedToken !== undefined;
    if (guardedToken && mode !== 'concurrent') {
      this.state.messages.push({
        message: 'guarded only allowed in concurrent statement',
        range: guardedToken.range
      });
    }
    if (this.getToken().getLText() === 'transport') { // 10.5.2.1 delay_mechanism
      this.consumeToken();
    } else {// 10.5.2.1 delay_mechanism inertial
      const [tokens] = this.advanceParenthesisAware([';'], false, false);
      // Search for inertial
      const numInertial = tokens.findIndex(token => token.getLText() === 'inertial');
      if (numInertial > -1) { // Found inertial now handle
        if (this.maybe('reject')) {
          const [tokens] = this.advanceParenthesisAware(['inertial'], true, false);
          const expressionParser = new ExpressionParser(this.state, assignment, tokens);
          assignment.references.push(...expressionParser.parse());
        }
        this.expect('inertial');
      }
    }
    let rightHandSide, endToken;
    let startI;
    do {
      startI = this.state.pos.i;
      [rightHandSide, endToken] = this.advanceParenthesisAware([';', 'when', 'else', 'after', ',', 'end'], true, true);
      if (rightHandSide[0]?.getLText() == 'unaffected') {
        continue;
      }
      const expressionParser = new ExpressionParser(this.state, assignment, rightHandSide);
      assignment.references.push(...expressionParser.parse());
    } while (endToken.getLText() !== ';' && endToken.getLText() !== 'end');
    if (endToken.getLText() === 'end') {
      this.state.messages.push({ message: `Unexpected end. Probably missing a ';'.`, range: endToken.range.copyWithNewStart(startI) });
    }
    assignment.range = assignment.range.copyWithNewEnd(this.state.pos.i);
    this.debug('parse end');
    return assignment;
  }
}