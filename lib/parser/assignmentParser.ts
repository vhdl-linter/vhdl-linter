import { OLexerToken } from '../lexer';
import { ExpressionParser } from './expressionParser';
import { OAssignment, ObjectBase, OName } from './objects';
import { ParserBase, ParserState } from './parserBase';

export class AssignmentParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase) {
    super(state);
    this.debug(`start`);
  }
  parse(mode: 'concurrent' | 'sequential', label?: OLexerToken, postponed = false): OAssignment {
    this.debug('parse');

    const assignment = new OAssignment(this.parent, this.getToken().range.copyExtendEndOfLine());
    let withNames: OName[] = [];
    if (this.maybe('with')) {
      const [expressionTokens] = this.advanceParenthesisAware(['select'], true, true);
      withNames = new ExpressionParser(this.state, assignment, expressionTokens).parse();

    }


    assignment.postponed = postponed;
    assignment.label = label;
    const leftHandSideNum = this.state.pos.num;
    this.findToken(['<=', ':=']);
    const leftHandSideTokens = [];
    leftHandSideTokens.push(...this.state.pos.lexerTokens.slice(leftHandSideNum, this.state.pos.num));
    const expressionParser = new ExpressionParser(this.state, assignment, leftHandSideTokens);
    assignment.names = expressionParser.parseTarget();
    assignment.names.unshift(...withNames);


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
      assignment.names.push(...expressionParser.parse());
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
          assignment.names.push(...expressionParser.parse());
        }
        this.expect('inertial');
      }
    }
    let rightHandSide, endToken;
    let startI;
    const unexpectedTokens = ['end', ':', 'if', 'for', 'while', 'case'];
    do {
      startI = this.state.pos.i;
      [rightHandSide, endToken] = this.advanceParenthesisAware([';', 'when', 'else', 'after', ',', ...unexpectedTokens], true, false);
      if (rightHandSide[0]?.getLText() == 'unaffected') {
        this.consumeToken();
        continue;
      }
      if (endToken.getLText() === ':') { // We accidentally caught  a label
        this.state.pos.num--;
        this.reverseWhitespace();
        rightHandSide = rightHandSide.slice(0, rightHandSide.length - 1);
      }
      const expressionParser = new ExpressionParser(this.state, assignment, rightHandSide);
      assignment.names.push(...expressionParser.parse());
      if (unexpectedTokens.includes(endToken.getLText()) === false) {
        this.consumeToken();
      }
    } while (endToken.getLText() !== ';' && unexpectedTokens.includes(endToken.getLText()) === false);
    assignment.range = assignment.range.copyWithNewEnd(this.getToken(-1, true).range.end);
    if (unexpectedTokens.includes(endToken.getLText())) {
      this.state.messages.push({ message: `Unexpected '${endToken.text}'. Probably missing a ';'.`, range: endToken.range.copyWithNewStart(startI) });
    }
    this.debug('parse end');
    return assignment;
  }
}