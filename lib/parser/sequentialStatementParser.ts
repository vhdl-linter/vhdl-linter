import { OLexerToken } from '../lexer';
import { AssignmentParser } from './assignmentParser';
import { AssociationListParser } from './associationListParser';
import { ExpressionParser } from './expressionParser';
import { OAssertion, OAssignment, ObjectBase, OCase, OConstant, OElseClause, OExit, OForLoop, OHasSequentialStatements, OIf, OIfClause, OInstantiation, OIRange, OLabelReference, OLibraryReference, OLoop, OReport, OReturn, OSequentialStatement, OWhenClause, OWhileLoop, ParserError } from './objects';
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
  parse(parent: OHasSequentialStatements | OIf, exitConditions: string[]): OSequentialStatement[] {
    const statements: OSequentialStatement[] = [];
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
        const loop = new OLoop(parent, this.getToken().range.copyExtendEndOfLine());
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
      } else if (nextToken.getLText() === 'assert') {
        statements.push(this.parseAssertion(parent, label));
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
          throw new ParserError(`unexpected )`, token.range);
        }
      } else if (braceLevel === 0 && (token.getLText() === ':=' || token.getLText() === '<=')) {
        return true;
      }
    }
    return false;
  }

  parseSubprogramCall(parent: OHasSequentialStatements | OIf, label: OLexerToken | undefined) {
    const subprogramCall = new OInstantiation(parent, this.getToken(), 'subprogram');
    subprogramCall.label = label;
    subprogramCall.entityName = this.consumeToken();
    while (this.getToken().getLText() === '.') {
      this.expect('.');
      if (subprogramCall.package !== undefined) {
        subprogramCall.library = new OLibraryReference(subprogramCall, subprogramCall.package);
      }
      subprogramCall.package = subprogramCall.entityName;
      subprogramCall.entityName = this.consumeToken();
    }
    if (this.getToken().getLText() === '(') {
      subprogramCall.portAssociationList = new AssociationListParser(this.state, subprogramCall).parse();
    }
    subprogramCall.range = subprogramCall.range.copyWithNewEnd(this.state.pos.i);
    this.expect(';');
    return subprogramCall;
  }

  parseAssertion(parent: OHasSequentialStatements | OIf, label?: OLexerToken): OAssertion {
    this.expect('assert');
    const assertion = new OAssertion(parent, this.getToken().range.copyExtendEndOfLine());
    assertion.label = label;

    assertion.references = [];
    let assertionTokens = this.advanceSemicolon();
    assertion.range = assertion.range.copyWithNewEnd(this.state.pos.i);
    const reportIndex = assertionTokens.findIndex(token => token.getLText() === 'report');
    if (reportIndex > -1) {
      assertion.references.push(...new ExpressionParser(this.state, assertion, assertionTokens.slice(0, reportIndex)).parse());
      assertionTokens = assertionTokens.slice(reportIndex + 1);
    }
    const severityIndex = assertionTokens.findIndex(token => token.getLText() === 'severity');
    if (severityIndex) {
      assertion.references.push(...new ExpressionParser(this.state, assertion, assertionTokens.slice(0, severityIndex)).parse());
      assertionTokens = assertionTokens.slice(severityIndex + 1);
    }
    assertion.references.push(...new ExpressionParser(this.state, assertion, assertionTokens).parse());
    return assertion;
  }

  parseReport(parent: OHasSequentialStatements | OIf, label?: OLexerToken): OReport {
    this.expect('report');
    const report = new OReport(parent, this.getToken().range.copyExtendEndOfLine());
    report.label = label;
    const [tokens, lastToken] = this.advanceParenthesisAware(['severity', ';'], true, true);
    report.references = new ExpressionParser(this.state, report, tokens).parse();
    if (lastToken.getLText() === 'severity') {
      const [tokens] = this.advanceParenthesisAware([';'], true, true);

      report.references.push(...new ExpressionParser(this.state, report, tokens).parse());

    }
    report.range = report.range.copyWithNewEnd(this.state.pos.i);
    return report;
  }

  parseReturn(parent: OHasSequentialStatements | OIf, label?: OLexerToken): OReport {
    this.expect('return');
    const _return = new OReturn(parent, this.getToken().range.copyExtendEndOfLine());
    _return.label = label;
    const tokens = this.advanceSemicolon();
    if (tokens.length > 0) {
      const expressionParser = new ExpressionParser(this.state, _return, tokens);
      try {
        _return.references.push(...expressionParser.parse());
      } catch (err) {
        if (err instanceof ParserError) {
          this.state.messages.push(err);
        } else {
          throw err;
        }
      }
    }
    _return.range = _return.range.copyWithNewEnd(this.state.pos.i);
    return _return;
  }

  parseWait(parent: OHasSequentialStatements | OIf, label?: OLexerToken) {
    this.expect('wait');
    const assignment = new OAssignment(parent, this.getToken().range.copyExtendEndOfLine());
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
  parseExit(parent: OHasSequentialStatements | OIf, label?: OLexerToken) {
    this.expect('exit');
    const exitStatement = new OExit(parent, this.getToken().range.copyExtendEndOfLine());
    exitStatement.label = label;
    const labelToken = this.getToken().isIdentifier() ? this.consumeToken() : undefined;
    if (labelToken) {
      exitStatement.labelReference = new OLabelReference(exitStatement, labelToken);
    }
    const [tokens] = this.advanceParenthesisAware([';'], true, false);
    if (tokens.length > 0) {
      exitStatement.references.push(...new ExpressionParser(this.state, exitStatement, tokens).parse());
    } else {
      exitStatement.references = [];
    }
    this.expect(';');
    return exitStatement;
  }
  parseWhile(parent: OHasSequentialStatements | OIf, label?: OLexerToken): OWhileLoop {
    const whileLoop = new OWhileLoop(parent, this.getToken().range.copyExtendEndOfLine());
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
  parseFor(parent: OHasSequentialStatements | OIf, label?: OLexerToken): OForLoop {
    const forLoop = new OForLoop(parent, this.getToken().range.copyExtendEndOfLine());
    forLoop.label = label;
    this.expect('for');
    const variableToken = this.consumeToken();
    const constant = new OConstant(forLoop, variableToken.range);
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
    this.expect(';');
    return forLoop;
  }
  parseIf(parent: OHasSequentialStatements | OIf, label?: OLexerToken) {
    this.debug(`parseIf`);

    const if_ = new OIf(parent, this.getToken().range.copyExtendEndOfLine());
    const clause = new OIfClause(if_, this.getToken().range.copyExtendEndOfLine());
    this.expect('if');
    const [conditionTokens] = this.advanceParenthesisAware(['then']);
    clause.condition = new ExpressionParser(this.state, clause, conditionTokens).parse();
    clause.statements = this.parse(clause, ['else', 'elsif', 'end']);
    clause.range = clause.range.copyWithNewEnd(this.getToken(-1, true).range.end);
    if_.clauses.push(clause);
    while (this.getToken().getLText() === 'elsif') {
      const clause = new OIfClause(if_, this.getToken().range.copyExtendEndOfLine());

      this.expect('elsif');
      const [conditionTokens] = this.advanceParenthesisAware(['then']);
      clause.condition = new ExpressionParser(this.state, clause, conditionTokens).parse();
      clause.statements = this.parse(clause, ['else', 'elsif', 'end']);
      clause.range = clause.range.copyWithNewEnd(this.getToken(-1, true).range.end);
      if_.clauses.push(clause);
    }
    if (this.getToken().getLText() === 'else') {
      this.expect('else');
      if_.else = new OElseClause(if_, new OIRange(if_, this.state.pos.i, this.state.pos.i));
      if_.else.statements = this.parse(if_, ['end']);
      if_.else.range = if_.else.range.copyWithNewEnd(this.getToken(-1, true).range.end);

    }
    this.expect('end');
    this.expect('if');
    if (label) {
      this.maybe(label);
    }
    this.expect(';');

    return if_;
  }
  parseCase(parent: ObjectBase, label?: OLexerToken): OCase {
    this.debug(`parseCase ${label?.text ?? ''}`);
    const case_ = new OCase(parent, this.getToken(-1, true).range.copyExtendEndOfLine());
    const [expressionTokens] = this.advanceParenthesisAware(['is']);
    case_.expression = new ExpressionParser(this.state, case_, expressionTokens).parse();

    while (this.getToken().getLText() === 'when') {
      this.debug(`parseWhen`);
      const whenClause = new OWhenClause(case_, this.getToken().range.copyExtendEndOfLine());
      const [whenTokens] = this.advanceParenthesisAware(['=>']);
      whenClause.condition = new ExpressionParser(this.state, whenClause, whenTokens).parse();
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