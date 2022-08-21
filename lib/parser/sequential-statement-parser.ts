import { AssignmentParser } from './assignment-parser';
import { AssociationListParser } from './association-list-parser';
import { OArchitecture, OAssertion, OAssignment, ObjectBase, OCase, OConstant, OElseClause, OEntity, OForLoop, OHasSequentialStatements, OI, OIf, OIfClause, OInstantiation, OLoop, OName, OProcess, OReport, OSequentialStatement, OVariable, OWhenClause, OWhileLoop, ParserError, OIRange } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';

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
      const statementText = this.advanceSemicolon(true, { consume: false });
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
        const loop = new OLoop(parent, this.pos.i, this.getEndOfLineI());
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
        this.advancePast(';');
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
        statements.push(this.parseSubprogramCall(parent));

      }
    }
    return statements;
  }
  // Assignments are detected by := or <= But as <= is comparison also can be part of e.g. procedure call
  // Solution: Mask everythin in braces. TODO: Port to tokens
  checkIfIsAssigment(statementText: string) {
    const regex = /\([^())]+\)/;
    let match = statementText.match(regex);
    let repeats = 100;
    while (match) {
      statementText = statementText.replace(match[0], ' '.repeat(match[0].length));
      repeats--;
      if (repeats === 0) {
        throw new ParserError('Parser Stuck', this.pos.getRangeToEndLine());
      }
      match = statementText.match(regex);
    }
    return statementText.match(/:=|<=/);
  }

  parseSubprogramCall(parent: OHasSequentialStatements | OIf) {
    const subprogramCall = new OInstantiation(parent, this.pos.i, this.getEndOfLineI(), 'subprogram-call');
    subprogramCall.componentName = new OName(subprogramCall, this.pos.i, this.pos.i);
    subprogramCall.componentName.text = this.getNextWord();
    subprogramCall.componentName.range.end.i = subprogramCall.componentName.range.start.i + subprogramCall.componentName.text.length;
    while (this.getToken().getLText() === '.') {
      this.expect('.');
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
    const assertion = new OAssertion(parent, this.pos.i, this.getEndOfLineI());
    assertion.reads = [];
    let assertionText = this.advanceSemicolon();
    let startI = assertion.range.start.i;
    assertion.range.end.i = this.pos.i;
    const reportMatch = /\breport\b/.exec(assertionText);
    if (reportMatch) {
      assertion.reads.push(...this.extractReads(assertion, assertionText.substring(0, reportMatch.index), startI));
      assertionText = assertionText.substring(reportMatch.index + reportMatch[0].length);
      startI += reportMatch.index + reportMatch[0].length;
    }
    const severityMatch = /\bseverity\b/.exec(assertionText);
    if (severityMatch) {
      assertion.reads.push(...this.extractReads(assertion, assertionText.substring(0, severityMatch.index), startI));
      assertionText = assertionText.substring(severityMatch.index + severityMatch[0].length);
      startI += severityMatch.index + severityMatch[0].length;
    }
    assertion.reads.push(...this.extractReads(assertion, assertionText, startI));
    return assertion;
  }
  parseReport(parent: OHasSequentialStatements | OIf): OReport {
    this.expect('report');
    let report = new OReport(parent, this.pos.i, this.getEndOfLineI());
    const text = this.advanceSemicolon();
    report.reads = this.extractReads(report, text, report.range.start.i);
    report.range.end.i = this.pos.i;
    return report;
  }

  parseWait(parent: OHasSequentialStatements | OIf) {
    this.expect('wait');
    let assignment = new OAssignment(parent, this.pos.i, this.getEndOfLineI());
    let nextWord = this.getNextWord({ consume: false });

    if (nextWord.toLowerCase() === 'on') { // Sensitivity Clause
      this.expect('on');
      let rightHandSideI = this.pos.i;
      const [rightHandSide] = this.advanceBraceAware(['until', 'for', ';'], true, false);
      assignment.reads.push(...this.extractReads(assignment, rightHandSide, rightHandSideI));
      nextWord = this.getNextWord({ consume: false });
    }

    if (nextWord.toLowerCase() === 'until') {
      this.expect('until');
      let rightHandSideI = this.pos.i;
      const [rightHandSide] = this.advanceBraceAware(['for', ';'], true, false);
      assignment.reads.push(...this.extractReads(assignment, rightHandSide, rightHandSideI));
      nextWord = this.getNextWord({ consume: false });

    }

    if (nextWord.toLowerCase() === 'for') {
      this.expect('for');
      let rightHandSideI = this.pos.i;
      const [rightHandSide] = this.advanceBraceAware([';'], true, false);
      assignment.reads.push(...this.extractReads(assignment, rightHandSide, rightHandSideI));
      nextWord = this.getNextWord({ consume: false });
    }

    assignment.range.end.i = this.pos.i;
    this.expect(';');
    return assignment;
  }
  parseWhile(parent: OHasSequentialStatements | OIf, label?: string): OWhileLoop {
    const whileLoop = new OWhileLoop(parent, this.pos.i, this.getEndOfLineI());
    this.expect('while');
    const startI = this.pos.i;
    const position = this.pos.i;
    const condition = this.advancePast('loop');
    whileLoop.conditionReads = this.extractReads(whileLoop, condition, position);
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
    const forLoop = new OForLoop(parent, this.pos.i, this.getEndOfLineI());
    this.expect('for');
    const startI = this.pos.i;
    const variableName = this.getNextWord();
    const constant = new OConstant(forLoop, startI, variableName.length + startI);
    constant.name = new OName(constant, startI, variableName.length + startI);
    constant.name.text = variableName;
    forLoop.constants.push(constant);
    this.expect('in');
    const rangeI = this.pos.i;
    const rangeText = this.advancePast('loop').trim();
    forLoop.constantRange = this.extractReads(forLoop, rangeText, rangeI);
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

    const if_ = new OIf(parent, this.pos.i, this.getEndOfLineI());
    const clause = new OIfClause(if_, this.pos.i, this.getEndOfLineI());
    this.expect('if');
    const position = this.pos.i;
    clause.condition = this.advancePast('then');
    clause.conditionReads = this.extractReads(clause, clause.condition, position);
    clause.statements = this.parse(clause, ['else', 'elsif', 'end']);
    clause.range.setEndBacktraceWhitespace(this.pos.i);
    if_.clauses.push(clause);
    let nextWord = this.getNextWord({ consume: false }).toLowerCase();
    while (nextWord === 'elsif') {
      const clause = new OIfClause(if_, this.pos.i, this.getEndOfLineI());

      this.expect('elsif');
      const position = this.pos.i;
      clause.condition = this.advancePast('then');
      clause.conditionReads = this.extractReads(clause, clause.condition, position);
      clause.statements = this.parse(clause, ['else', 'elsif', 'end']);
      clause.range.setEndBacktraceWhitespace(this.pos.i);
      if_.clauses.push(clause);
      nextWord = this.getNextWord({ consume: false }).toLowerCase();
    }
    if (nextWord === 'else') {
      this.expect('else');
      if_.else = new OElseClause(if_, this.pos.i, this.pos.i);
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
    const case_ = new OCase(parent, this.pos.i, this.getEndOfLineI());
    const posI = this.pos.i;
    case_.variable = this.extractReads(case_, this.advancePast('is'), posI);
    // this.debug(`Apfel`);

    let nextWord = this.getNextWord().toLowerCase();
    while (nextWord === 'when') {
      this.debug(`parseWhen`);
      const whenClause = new OWhenClause(case_, this.pos.i, this.getEndOfLineI());
      const pos = this.pos.i;
      whenClause.condition = this.extractReads(whenClause, this.advancePast('=>'), pos);
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