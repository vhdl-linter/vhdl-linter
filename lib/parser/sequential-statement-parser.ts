import { AssignmentParser } from './assignment-parser';
import { AssociationListParser } from './association-list-parser';
import { OArchitecture, OAssignment, ObjectBase, OCase, OElseClause, OEntity, OForLoop, OHasSequentialStatements, OI, OIf, OIfClause, OInstantiation, OLoop, OName, OProcess, OSequentialStatement, OVariable, OWhenClause, OWhileLoop } from './objects';
import { ParserBase } from './parser-base';

export class SequentialStatementParser extends ParserBase {
  constructor(text: string, pos: OI, file: string) {
    super(text, pos, file);
    this.debug('start');
  }
  parse(parent: OHasSequentialStatements | OIf, exitConditions: string[]): OSequentialStatement[] {
    const statements: OSequentialStatement[] = [];
    while (this.pos.i < this.text.length) {
      let nextWord = this.getNextWord({ consume: false });
      let label;
      if (this.text.substr(this.pos.i + nextWord.length).match(/^\s*:(?!=)/)) {
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
        this.advancePast(';');
      } else if (nextWord.toLowerCase() === 'assert') {
        this.advancePast(';');
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
      } else if (statementText.match(/:=|<=/)) {
        const assignmentParser = new AssignmentParser(this.text, this.pos, this.file, parent);
        statements.push(assignmentParser.parse());
      } else {
        statements.push(this.parseSubprogramCall(parent));

      }
    }
    return statements;
  }
  parseSubprogramCall(parent: OHasSequentialStatements | OIf) {
    const subprogramCall = new OInstantiation(parent, this.pos.i, this.getEndOfLineI(), 'subprogram-call');
    subprogramCall.componentName = new OName(subprogramCall, this.pos.i, this.pos.i);
    subprogramCall.componentName.text = this.getNextWord();
    subprogramCall.componentName.range.end.i = subprogramCall.componentName.range.start.i + subprogramCall.componentName.text.length;
    while (this.text[this.pos.i] === '.') {
      this.expect('.');
      subprogramCall.componentName.range.start.i = this.pos.i;
      subprogramCall.componentName.text = this.getNextWord();
      subprogramCall.componentName.range.end.i = subprogramCall.componentName.range.start.i + subprogramCall.componentName.text.length;

    }
    if (this.text[this.pos.i] === '(') {
      subprogramCall.portAssociationList = new AssociationListParser(this.text, this.pos, this.file, subprogramCall).parse();
    }
    subprogramCall.range.end.i = this.pos.i;
    this.expect(';');
    return subprogramCall;
  }
  parseWait(parent: OHasSequentialStatements | OIf) {
    this.expect('wait');
    let nextWord = this.getNextWord({ consume: false });
    if (['until', 'on', 'for'].indexOf(nextWord.toLowerCase()) > -1) {
      this.getNextWord();
      let assignment = new OAssignment(parent, this.pos.i, this.getEndOfLineI());
      let rightHandSideI = this.pos.i;
      const rightHandSide = this.advanceSemicolon();
      assignment.reads.push(...this.extractReads(assignment, rightHandSide, rightHandSideI));
      assignment.range.end.i = this.pos.i;
      return assignment;
    } else {
      this.expect(';');
      let assignment = new OAssignment(parent, this.pos.i, this.getEndOfLineI());
      return assignment;
    }
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
    const variable = new OVariable(forLoop, startI, variableName.length + startI)
    variable.name = new OName(variable, startI, variableName.length + startI);
    variable.name.text = variableName;
    forLoop.variables.push(variable);
    this.expect('in');
    const rangeI = this.pos.i;
    const rangeText = this.advancePast(/\bloop\b/i).trim();
    forLoop.variableRange = this.extractReads(forLoop, rangeText, rangeI);
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
    case_.variable = this.extractReads(case_, this.advancePast(/\bis\b/i), posI);
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