import { AssignmentParser } from './assignment-parser';
import { AssociationListParser } from './association-list-parser';
import { OArchitecture, OAssertion, OAssignment, ObjectBase, OCase, OConstant, OElseClause, OEntity, OForLoop, OHasSequentialStatements, OI, OIf, OIfClause, OInstantiation, OLoop, OName, OProcess, OReport, OSequentialStatement, OVariable, OWhenClause, OWhileLoop, ParserError, OIRange, OReturn } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';
import { OLexerToken } from '../lexer';

export class SequentialStatementParser extends ParserBase {
  constructor(pos: ParserPosition, file: string) {
    super(pos, file);
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
    while (this.pos.isValid()) {
      let nextWord = this.getNextWord({ consume: false });
      let label;
      if (this.isLabel()) {
        label = nextWord;
        this.getNextWord(); // consume label
        this.expect(':');
        nextWord = this.getNextWord({ consume: false });
      }
      const statementText = this.advanceSemicolonToken(true, { consume: false });
      if (nextWord.toLowerCase() === 'if') {
        statements.push(this.parseIf(parent, label));
      } else if (exitConditions.indexOf(nextWord.toLowerCase()) > -1) {
        break;
      } else if (nextWord.toLowerCase() === 'case') {
        this.getNextWord();
        statements.push(this.parseCase(parent, label));
      } else if (nextWord.toLowerCase() === 'for') {
        statements.push(this.parseFor(parent, label));
      } else if (nextWord.toLowerCase() === 'loop') {
        this.expect('loop');
        const loop = new OLoop(parent, this.getToken().range.copyExtendEndOfLine());
        loop.statements = this.parse(loop, ['end']);
        statements.push(loop);
        this.expect('end');
        this.expect('loop');
        if (label) {
          this.maybeWord(label);
        }
        this.expect(';');
      } else if (nextWord.toLowerCase() === 'report') {
        statements.push(this.parseReport(parent));
      } else if (nextWord.toLowerCase() === 'assert') {
        statements.push(this.parseAssertion(parent));
      } else if (nextWord.toLowerCase() === 'wait') {
        statements.push(this.parseWait(parent));
      } else if (nextWord.toLowerCase() === 'exit') {
        this.advancePast(';');
      } else if (nextWord.toLowerCase() === 'return') {
        statements.push(this.parseReturn(parent));
      } else if (nextWord.toLowerCase() === 'null') {
        this.advancePast(';');
      } else if (nextWord.toLowerCase() === 'next') {
        this.advancePast(';');
      } else if (nextWord.toLowerCase() === 'while') {
        statements.push(this.parseWhile(parent, label));
      } else if (this.checkIfIsAssigment(statementText)) {
        const assignmentParser = new AssignmentParser(this.pos, this.filePath, parent);
        statements.push(assignmentParser.parse());
      } else {
        statements.push(this.parseSubprogramCall(parent, label));

      }
    }
    return statements;
  }
  // Assignments are detected by := or <= But as <= is comparison also can be part of e.g. procedure call
  checkIfIsAssigment(statementTokens: OLexerToken[]) {
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

  parseSubprogramCall(parent: OHasSequentialStatements | OIf, label: string|undefined) {
    const subprogramCall = new OInstantiation(parent, this.getToken().range.copyExtendEndOfLine(), 'subprogram');
    subprogramCall.label = label;
    subprogramCall.componentName = new OName(subprogramCall, new OIRange(subprogramCall, this.pos.i, this.pos.i));
    subprogramCall.componentName.text = this.getNextWord();
    subprogramCall.componentName.range.end.i = subprogramCall.componentName.range.start.i + subprogramCall.componentName.text.length;
    while (this.getToken().getLText() === '.') {
      this.expect('.');
      subprogramCall.library = subprogramCall.package?.text;
      subprogramCall.package = subprogramCall.componentName;
      subprogramCall.componentName = new OName(subprogramCall, new OIRange(subprogramCall, this.pos.i, this.pos.i));
      subprogramCall.componentName.range.start.i = this.pos.i;
      subprogramCall.componentName.text = this.getNextWord();
      subprogramCall.componentName.range.end.i = subprogramCall.componentName.range.start.i + subprogramCall.componentName.text.length;

    }
    if (this.getToken().getLText() === '(') {
      subprogramCall.portAssociationList = new AssociationListParser(this.pos, this.filePath, subprogramCall).parse();
    }
    subprogramCall.range.end.i = this.pos.i;
    this.expect(';');
    return subprogramCall;
  }

  parseAssertion(parent: OHasSequentialStatements | OIf): OAssertion {
    this.expect('assert');
    const assertion = new OAssertion(parent, this.getToken().range.copyExtendEndOfLine());
    assertion.reads = [];
    let assertionTokens = this.advanceSemicolonToken();
    let startI = assertion.range.start.i;
    assertion.range.end.i = this.pos.i;
    const reportIndex = assertionTokens.findIndex(token => token.getLText() === 'report');
    if (reportIndex > -1) {
      assertion.reads.push(...this.extractReads(assertion, assertionTokens.slice(0, reportIndex)));
      assertionTokens = assertionTokens.slice(reportIndex + 1);
    }
    const severityIndex = assertionTokens.findIndex(token => token.getLText() === 'severity');
    if (severityIndex) {
      assertion.reads.push(...this.extractReads(assertion, assertionTokens.slice(0, severityIndex)));
      assertionTokens = assertionTokens.slice(severityIndex + 1);
    }
    assertion.reads.push(...this.extractReads(assertion, assertionTokens));
    return assertion;
  }

  parseReport(parent: OHasSequentialStatements | OIf): OReport {
    this.expect('report');
    let report = new OReport(parent, this.getToken().range.copyExtendEndOfLine());
    const text = this.advanceSemicolonToken();
    report.reads = this.extractReads(report, text);
    report.range.end.i = this.pos.i;
    return report;
  }

  parseReturn(parent: OHasSequentialStatements | OIf): OReport {
    this.expect('return');
    let _return = new OReturn(parent, this.getToken().range.copyExtendEndOfLine());
    const text = this.advanceSemicolonToken();
    _return.reads = this.extractReads(_return, text);
    _return.range.end.i = this.pos.i;
    return _return;
  }

  parseWait(parent: OHasSequentialStatements | OIf) {
    this.expect('wait');
    let assignment = new OAssignment(parent, this.getToken().range.copyExtendEndOfLine());
    let nextWord = this.getNextWord({ consume: false });

    if (nextWord.toLowerCase() === 'on') { // Sensitivity Clause
      this.expect('on');
      let rightHandSideI = this.pos.i;
      const [rightHandSide] = this.advanceBraceAwareToken(['until', 'for', ';'], true, false);
      assignment.reads.push(...this.extractReads(assignment, rightHandSide));
      nextWord = this.getNextWord({ consume: false });
    }

    if (nextWord.toLowerCase() === 'until') {
      this.expect('until');
      let rightHandSideI = this.pos.i;
      const [rightHandSide] = this.advanceBraceAwareToken(['for', ';'], true, false);
      assignment.reads.push(...this.extractReads(assignment, rightHandSide));
      nextWord = this.getNextWord({ consume: false });

    }

    if (nextWord.toLowerCase() === 'for') {
      this.expect('for');
      let rightHandSideI = this.pos.i;
      const [rightHandSide] = this.advanceBraceAwareToken([';'], true, false);
      assignment.reads.push(...this.extractReads(assignment, rightHandSide));
      nextWord = this.getNextWord({ consume: false });
    }

    assignment.range.end.i = this.pos.i;
    this.expect(';');
    return assignment;
  }
  parseWhile(parent: OHasSequentialStatements | OIf, label?: string): OWhileLoop {
    const whileLoop = new OWhileLoop(parent, this.getToken().range.copyExtendEndOfLine());
    this.expect('while');
    const startI = this.pos.i;
    const position = this.pos.i;
    const condition = this.advancePastToken('loop');
    whileLoop.conditionReads = this.extractReads(whileLoop, condition);
    whileLoop.statements = this.parse(whileLoop, ['end']);
    this.expect('end');
    this.expect('loop');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');
    return whileLoop;
  }
  parseFor(parent: OHasSequentialStatements | OIf, label?: string): OForLoop {
    const forLoop = new OForLoop(parent, this.getToken().range.copyExtendEndOfLine());
    this.expect('for');
    const variableName = this.consumeToken();
    const constant = new OConstant(forLoop, variableName.range);
    constant.name = new OName(constant, variableName.range);
    constant.name.text = variableName.text;
    forLoop.constants.push(constant);
    this.expect('in');
    const rangeToken = this.advancePastToken('loop');
    forLoop.constantRange = this.extractReads(forLoop, rangeToken);
    forLoop.statements = this.parse(forLoop, ['end']);
    this.expect('end');
    this.expect('loop');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');
    return forLoop;
  }
  parseIf(parent: OHasSequentialStatements | OIf, label?: string) {
    this.debug(`parseIf`);

    const if_ = new OIf(parent, this.getToken().range.copyExtendEndOfLine());
    const clause = new OIfClause(if_, this.getToken().range.copyExtendEndOfLine());
    this.expect('if');
    const position = this.pos.i;
    clause.condition = this.advancePastToken('then');
    clause.conditionReads = this.extractReads(clause, clause.condition);
    clause.statements = this.parse(clause, ['else', 'elsif', 'end']);
    clause.range.setEndBacktraceWhitespace(this.pos.i);
    if_.clauses.push(clause);
    let nextWord = this.getNextWord({ consume: false }).toLowerCase();
    while (nextWord === 'elsif') {
      const clause = new OIfClause(if_, this.getToken().range.copyExtendEndOfLine());

      this.expect('elsif');
      const position = this.pos.i;
      clause.condition = this.advancePastToken('then');
      clause.conditionReads = this.extractReads(clause, clause.condition);
      clause.statements = this.parse(clause, ['else', 'elsif', 'end']);
      clause.range.setEndBacktraceWhitespace(this.pos.i);
      if_.clauses.push(clause);
      nextWord = this.getNextWord({ consume: false }).toLowerCase();
    }
    if (nextWord === 'else') {
      this.expect('else');
      if_.else = new OElseClause(if_, new OIRange(if_, this.pos.i, this.pos.i));
      if_.else.statements = this.parse(if_, ['end']);
      if_.else.range.setEndBacktraceWhitespace(this.pos.i);

    }
    this.expect('end');
    this.expect('if');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');

    return if_;
  }
  parseCase(parent: ObjectBase, label?: string): OCase {
    this.debug(`parseCase ${label}`);
    const case_ = new OCase(parent, this.getToken().range.copyExtendEndOfLine());
    const posI = this.pos.i;
    case_.variable = this.extractReads(case_, this.advancePastToken('is'));
    // this.debug(`Apfel`);

    let nextWord = this.getNextWord().toLowerCase();
    while (nextWord === 'when') {
      this.debug(`parseWhen`);
      const whenClause = new OWhenClause(case_, this.getToken().range.copyExtendEndOfLine());
      const pos = this.pos.i;
      whenClause.condition = this.extractReads(whenClause, this.advancePastToken('=>'));
      whenClause.statements = this.parse(whenClause, ['when', 'end']);
      whenClause.range.setEndBacktraceWhitespace(this.pos.i);
      case_.whenClauses.push(whenClause);
      nextWord = this.getNextWord().toLowerCase();
    }
    this.expect('case');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');
    this.debug(`parseCaseDone ${label}`);

    return case_;
  }
}