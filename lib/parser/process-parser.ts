import { ParserBase } from './parser-base';
import { ParserPosition } from './parser-position';
import { AssignmentParser } from './assignment-parser';

import { OProcess, OStatement, OForLoop, OIf, OIfClause, OCase, OWhenClause, OVariable, ORead } from './objects';

export class ProcessParser extends ParserBase {
  constructor(text: string, pos: ParserPosition, file: string, private parent: object) {
    super(text, pos, file);
    this.debug(`start`);

  }
  parse(label?: string): OProcess {
    this.expect('(');
    const process = new OProcess(this.parent, this.pos.i);

    process.sensitivityList = this.advancePast(')');
    this.maybeWord('is');
    let nextWord = this.getNextWord({ consume: false }).toLowerCase();
    while (nextWord !== 'begin') {
      const variable = new OVariable(process, this.pos.i);
      variable.constant = false;
      this.expect('variable');
      variable.name = this.getNextWord();
      let multiSignals: string[] = []; // TODO: Fix this!!
      if (this.text[this.pos.i] === ',') {
        multiSignals.push(name);
        this.expect(',');

        continue;
      }
      this.expect(':');
      let type = this.getType();
      if (type.indexOf(':=') > -1) {
        const split = type.split(':=');
        type = split[0].trim();
        variable.defaultValue = split[1].trim();
      }
      for (const multiSignalName of multiSignals) {
        const multiSignal = new OVariable(process, -1);
        Object.assign(variable, multiSignal);
        multiSignal.name = multiSignalName;
        process.variables.push(multiSignal);
      }
      process.variables.push(variable);
      multiSignals = [];
      nextWord = this.getNextWord({ consume: false }).toLowerCase();
    }
    this.expect('begin');
    process.statements = this.parseStatements(process, ['end']);
    this.expect('end');
    this.expect('process');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');
    return process;
  }
  parseStatements(parent: object, exitConditions: string[]): OStatement[] {
    const statements = [];
    while (this.pos.i < this.text.length) {
      let nextWord = this.getNextWord({ consume: false });
      let label;
      if (this.text.substr(this.pos.i + nextWord.length).match(/^\s*:/)) {
        label = nextWord;
        this.getNextWord(); // consume label
        this.expect(':');
        nextWord = this.getNextWord({ consume: false });
      }
      if (nextWord.toLowerCase() === 'if') {
        statements.push(this.parseIf(parent, label));
      } else if (exitConditions.indexOf(nextWord.toLowerCase()) > -1) {
        break;
      } else if (nextWord.toLowerCase() === 'case') {
        this.getNextWord();
        statements.push(this.parseCase(parent, label));
      } else if (nextWord.toLowerCase() === 'for') {
        statements.push(this.parseFor(parent, label));
      } else if (nextWord.toLowerCase() === 'report') {
        this.advancePast(';');
      } else if (nextWord.toLowerCase() === 'null') {
        this.advancePast(';');
      } else {
        const assignmentParser = new AssignmentParser(this.text, this.pos, this.file, parent);
        statements.push(assignmentParser.parse());
      }
    }
    return statements;
  }
  parseFor(parent: object, label?: string): OForLoop {
    const forLoop = new OForLoop(parent, this.pos.i);
    this.expect('for');
    forLoop.variable = this.getNextWord();
    this.expect('in');
    // forLoop.start = this.getNextWord();
    forLoop.start = this.advancePast(/\b(?:downto|to)\b/i).trim();
    // this.expect(['downto', 'to']);
    forLoop.end = this.advancePast('loop').trim();
    forLoop.statements = this.parseStatements(forLoop, ['end']);
    this.expect('end');
    this.expect('loop');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');
    return forLoop;
  }
  parseIf(parent: object, label?: string): OIf {
    this.debug(`parseIf`);

    const if_ = new OIf(parent, this.pos.i);
    const clause = new OIfClause(if_, this.pos.i);
    this.expect('if');
    const position = this.pos.i;
    clause.condition = this.advancePast('then');
    clause.conditionReads = this.tokenize(clause.condition).filter(token => (token.type === 'FUNCTION') || (token.type === 'VARIABLE')).map(token => {
      const read = new ORead(clause, position + token.offset);
      read.text = token.value;
      read.begin = position + token.offset;
      read.end = position + token.offset + token.value.length;
      return read;
    });
    clause.statements = this.parseStatements(clause, ['else', 'elsif', 'end']);
    if_.clauses.push(clause);
    let nextWord = this.getNextWord({ consume: false }).toLowerCase();
    while (nextWord === 'elsif') {
      const clause = new OIfClause(if_, this.pos.i);

      this.expect('elsif');
      const position = this.pos.i;
      clause.condition = this.advancePast('then');
      clause.conditionReads = this.tokenize(clause.condition).filter(token => (token.type === 'VARIABLE') || (token.type === 'FUNCTION')).map(token => {
        const read = new ORead(clause, position + token.offset);
        read.text = token.value;
        read.begin = position + token.offset;
        read.end = position + token.offset + token.value.length;
        return read;
      });
      clause.statements = this.parseStatements(clause, ['else', 'elsif', 'end']);
      if_.clauses.push(clause);
      nextWord = this.getNextWord({ consume: false }).toLowerCase();
    }
    if (nextWord === 'else') {
      this.expect('else');
      if_.elseStatements = this.parseStatements(if_, ['end']);
    }
    this.expect('end');
    this.expect('if');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');
    return if_;
  }
  parseCase(parent: object, label?: string): OCase {
    this.debug(`parseCase ${label}`);
    const case_ = new OCase(parent, this.pos.i);
    const posI = this.pos.i;
    case_.variable = this.extractReads(case_, this.advancePast(/\bis\b/i), posI);
    this.debug(`Apfel`);

    let nextWord = this.getNextWord().toLowerCase();
    while (nextWord === 'when') {
      this.debug(`parseWhen`);
      const whenClause = new OWhenClause(case_, this.pos.i);

      const pos = this.pos.i;
      whenClause.condition = this.extractReads(whenClause, this.advancePast('=>'), pos);
      whenClause.statements = this.parseStatements(whenClause, ['when', 'end']);
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
