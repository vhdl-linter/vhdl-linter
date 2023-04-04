import { OLexerToken } from '../lexer';
import { AssertionParser } from './assertionParser';
import { AssignmentParser } from './assignmentParser';
import { AssociationListParser } from './associationListParser';
import { ExpressionParser } from './expressionParser';
import * as O from './objects';
import { ParserBase, ParserState } from './parserBase';

export class SequentialStatementParser extends ParserBase {
  constructor(state: ParserState) {
    super(state);
    this.debug('start');
  }
  isLabel() {
    let i = 1;
    while (this.getToken(i).isWhitespace()) {
      i++;
    }
    return this.getToken(i).text === ':';
  }
  parse(parent: O.OSequenceOfStatements, exitConditions: string[]): O.OSequentialStatement[] {
    const statements: O.OSequentialStatement[] = [];
    const start = this.getToken(-1, true).range;
    while (this.state.pos.isValid()) {
      let nextToken = this.getToken();
      let label;
      if (this.isLabel()) {
        label = nextToken;
        this.consumeToken(); // consume label
        this.expect(':');
        nextToken = this.getToken();
      }
      const statementText = this.advanceSemicolon(false);
      if (nextToken.getLText() === 'if') {
        statements.push(this.parseIf(parent, label));
      } else if (exitConditions.includes(nextToken.getLText())) {
        break;
      } else if (nextToken.getLText() === 'case') {
        this.consumeToken();
        statements.push(this.parseCase(parent, label));
      } else if (nextToken.getLText() === 'for') {
        statements.push(this.parseFor(parent, label));
      } else if (nextToken.getLText() === 'loop') {
        this.expect('loop');
        const loop = new O.OLoop(parent, this.getToken().range.copyExtendEndOfLine());
        loop.label = label;
        loop.statements = this.parse(loop, ['end']);
        statements.push(loop);
        this.expect('end');
        this.expect('loop');
        if (label) {
          this.maybe(label);
        }
        this.expect(';');
      } else if (nextToken.getLText() === 'report') {
        statements.push(this.parseReport(parent, label));
      } else if ((nextToken.getLText() === 'assert' || nextToken.getLText() === 'postponed')) {
        statements.push(new AssertionParser(this.state, parent).parse(label));
      } else if (nextToken.getLText() === 'wait') {
        statements.push(this.parseWait(parent, label));
      } else if (nextToken.getLText() === 'exit') {
        statements.push(this.parseExit(parent, label));
      } else if (nextToken.getLText() === 'return') {
        statements.push(this.parseReturn(parent, label));
      } else if (nextToken.getLText() === 'null') {
        this.advanceSemicolon();
      } else if (nextToken.getLText() === 'next') {
        this.advanceSemicolon();
      } else if (nextToken.getLText() === 'while') {
        statements.push(this.parseWhile(parent, label));
      } else if (this.checkIfIsAssignment(statementText)) {
        const assignmentParser = new AssignmentParser(this.state, parent);
        statements.push(assignmentParser.parse('sequential', label));
      } else {
        statements.push(this.parseSubprogramCall(parent, label));

      }
    }
    parent.statementsRange = start.copyWithNewEnd(this.getToken().range);
    return statements;
  }
  // Assignments are detected by := or <= But as <= is comparison also can be part of e.g. procedure call
  checkIfIsAssignment(statementTokens: OLexerToken[]) {
    let braceLevel = 0;
    for (const token of statementTokens) {
      if (token.getLText() === '(') {
        braceLevel++;
      } else if (token.getLText() === ')') {
        if (braceLevel > 0) {
          braceLevel--;
        } else {
          throw new O.ParserError(`unexpected )`, token.range);
        }
      } else if (braceLevel === 0 && (token.getLText() === ':=' || token.getLText() === '<=')) {
        return true;
      }
    }
    return false;
  }

  parseSubprogramCall(parent: O.OSequenceOfStatements | O.OIf, label: OLexerToken | undefined) {
    const subprogramCall = new O.OInstantiation(parent, this.getToken(), 'subprogram');
    subprogramCall.label = label;
    subprogramCall.instantiatedUnit = this.advanceSelectedName(subprogramCall);
    if (this.getToken().getLText() === '(') {
      subprogramCall.portAssociationList = new AssociationListParser(this.state, subprogramCall).parsePortAssociations();
    }
    subprogramCall.range = subprogramCall.range.copyWithNewEnd(this.state.pos.i);
    this.expect(';');
    return subprogramCall;
  }

  parseReport(parent: O.OSequenceOfStatements | O.OIf, label?: OLexerToken): O.OReport {
    this.expect('report');
    const report = new O.OReport(parent, this.getToken().range.copyExtendEndOfLine());
    report.label = label;
    const [tokens, lastToken] = this.advanceParenthesisAware(['severity', ';'], true, true);
    report.names = new ExpressionParser(this.state, report, tokens).parse();
    if (lastToken.getLText() === 'severity') {
      const [tokens] = this.advanceParenthesisAware([';'], true, true);

      report.names.push(...new ExpressionParser(this.state, report, tokens).parse());

    }
    report.range = report.range.copyWithNewEnd(this.state.pos.i);
    return report;
  }

  parseReturn(parent: O.OSequenceOfStatements | O.OIf, label?: OLexerToken): O.OReport {
    this.expect('return');
    const _return = new O.OReturn(parent, this.getToken().range.copyExtendEndOfLine());
    _return.label = label;
    const tokens = this.advanceSemicolon();
    if (tokens.length > 0) {
      const expressionParser = new ExpressionParser(this.state, _return, tokens);
      try {
        _return.names.push(...expressionParser.parse());
      } catch (err) {
        if (err instanceof O.ParserError) {
          this.state.messages.push(err);
        } else {
          throw err;
        }
      }
    }
    _return.range = _return.range.copyWithNewEnd(this.state.pos.i);
    return _return;
  }

  parseWait(parent: O.OSequenceOfStatements | O.OIf, label?: OLexerToken) {
    this.expect('wait');
    const assignment = new O.OAssignment(parent, this.getToken().range.copyExtendEndOfLine());
    assignment.label = label;
    if (this.getToken().getLText() === 'on') { // Sensitivity Clause
      this.expect('on');
      const [rightHandSide] = this.advanceParenthesisAware(['until', 'for', ';'], true, false);
      assignment.labelLinks.push(...new ExpressionParser(this.state, assignment, rightHandSide).parse());
    }

    if (this.getToken().getLText() === 'until') {
      this.expect('until');
      const [rightHandSide] = this.advanceParenthesisAware(['for', ';'], true, false);
      assignment.labelLinks.push(...new ExpressionParser(this.state, assignment, rightHandSide).parse());

    }

    if (this.getToken().getLText() === 'for') {
      this.expect('for');
      const [rightHandSide] = this.advanceParenthesisAware([';'], true, false);
      assignment.labelLinks.push(...new ExpressionParser(this.state, assignment, rightHandSide).parse());
    }

    assignment.range = assignment.range.copyWithNewEnd(this.state.pos.i);
    this.expect(';');
    return assignment;
  }
  parseExit(parent: O.OSequenceOfStatements | O.OIf, label?: OLexerToken) {
    this.expect('exit');
    const exitStatement = new O.OExit(parent, this.getToken().range.copyExtendEndOfLine());
    exitStatement.label = label;
    const labelToken = this.getToken().isIdentifier() ? this.consumeToken() : undefined;
    if (labelToken) {
      exitStatement.labelName = new O.OLabelName(exitStatement, labelToken);
    }
    const  whenToken = this.maybe('when');
    if (whenToken) {
      const [tokens] = this.advanceParenthesisAware([';'], true, false);
      if (tokens.length > 0) {
        exitStatement.names.push(...new ExpressionParser(this.state, exitStatement, tokens).parse());
      } else {
        this.state.messages.push({
          message: 'Condition expected',
          range: whenToken.range.copyExtendEndOfLine()
        });
        exitStatement.names = [];
      }
    }
    this.expect(';');
    return exitStatement;
  }
  parseWhile(parent: O.OSequenceOfStatements | O.OIf, label?: OLexerToken): O.OWhileLoop {
    const whileLoop = new O.OWhileLoop(parent, this.getToken().range.copyExtendEndOfLine());
    this.expect('while');
    whileLoop.label = label;
    const [condition] = this.advanceParenthesisAware(['loop']);
    whileLoop.condition = new ExpressionParser(this.state, whileLoop, condition).parse();
    whileLoop.statements = this.parse(whileLoop, ['end']);
    this.expect('end');
    this.expect('loop');
    if (label) {
      this.maybe(label);
    }
    this.expect(';');
    return whileLoop;
  }
  parseFor(parent: O.OSequenceOfStatements | O.OIf, label?: OLexerToken): O.OForLoop {
    const forLoop = new O.OForLoop(parent, this.getToken().range.copyExtendEndOfLine());
    forLoop.label = label;
    this.expect('for');
    const variableToken = this.consumeToken();
    const constant = new O.OConstant(forLoop, variableToken.range);
    constant.lexerToken = variableToken;
    forLoop.declarations.push(constant);
    this.expect('in');
    const [rangeToken] = this.advanceParenthesisAware(['loop']);
    forLoop.constantRange = new ExpressionParser(this.state, forLoop, rangeToken).parse();
    forLoop.statements = this.parse(forLoop, ['end']);
    this.expect('end');
    this.expect('loop');
    if (label) {
      this.maybe(label);
    }
    forLoop.range = forLoop.range.copyWithNewEnd(this.getToken().range);
    this.expect(';');
    return forLoop;
  }
  parseIf(parent: O.OSequenceOfStatements | O.OIf, label?: OLexerToken) {
    this.debug(`parseIf`);

    const if_ = new O.OIf(parent, this.getToken().range.copyExtendEndOfLine());
    const clause = new O.OIfClause(if_, this.getToken().range.copyExtendEndOfLine());
    this.expect('if');
    const [conditionTokens] = this.advanceParenthesisAware(['then']);
    clause.condition = new ExpressionParser(this.state, clause, conditionTokens).parse();
    clause.statements = this.parse(clause, ['else', 'elsif', 'end']);
    clause.range = clause.range.copyWithNewEnd(this.getToken(-1, true).range.end);
    if_.clauses.push(clause);
    while (this.getToken().getLText() === 'elsif') {
      const clause = new O.OIfClause(if_, this.getToken().range.copyExtendEndOfLine());

      this.expect('elsif');
      const [conditionTokens] = this.advanceParenthesisAware(['then']);
      clause.condition = new ExpressionParser(this.state, clause, conditionTokens).parse();
      clause.statements = this.parse(clause, ['else', 'elsif', 'end']);
      clause.range = clause.range.copyWithNewEnd(this.getToken(-1, true).range.end);
      if_.clauses.push(clause);
    }
    if (this.getToken().getLText() === 'else') {
      this.expect('else');
      const elseClause = new O.OElseClause(if_, new O.OIRange(if_, this.state.pos.i, this.state.pos.i));
      elseClause.statements = this.parse(elseClause, ['end']);
      elseClause.range = elseClause.range.copyWithNewEnd(this.getToken(-1, true).range.end);
      if_.else = elseClause;
    }
    this.expect('end');
    this.expect('if');
    if (label) {
      this.maybe(label);
    }
    this.expect(';');

    return if_;
  }
  parseCase(parent: O.ObjectBase, label?: OLexerToken): O.OCase {
    this.debug(`parseCase ${label?.text ?? ''}`);
    const case_ = new O.OCase(parent, this.getToken(-1, true).range.copyExtendEndOfLine());
    const [expressionTokens] = this.advanceParenthesisAware(['is']);
    case_.expression = new ExpressionParser(this.state, case_, expressionTokens).parse();

    while (this.getToken().getLText() === 'when') {
      this.debug(`parseWhen`);
      const whenClause = new O.OWhenClause(case_, this.getToken().range.copyExtendEndOfLine());
      this.consumeToken(); // consume 'when'
      [whenClause.whenTokens] = this.advanceParenthesisAware(['=>']);
      whenClause.condition = new ExpressionParser(this.state, whenClause, whenClause.whenTokens).parse();
      whenClause.statements = this.parse(whenClause, ['when', 'end']);
      whenClause.range = whenClause.range.copyWithNewEnd(this.getToken(-1, true).range.end);
      case_.whenClauses.push(whenClause);
    }
    this.expect('end');
    this.expect('case');
    if (label) {
      this.maybe(label);
    }
    case_.range = case_.range.copyWithNewEnd(this.getToken().range);
    this.expect(';');
    this.debug(`parseCaseDone ${label?.text ?? ''}`);

    return case_;
  }
}