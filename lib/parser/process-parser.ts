import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position'
import {AssignmentParser} from './assignment-parser';

import {OProcess, OStatement, OForLoop, OIf, OIfClause, OCase, OWhenClause, OSignal} from './objects';

export class ProcessParser extends ParserBase {
  constructor(text: string, pos: ParserPosition, file: string) {
    super(text, pos, file);
    this.debug(`start`);

  }
  parse(label?: string): OProcess {
    this.expect('(');
    const process = new OProcess(this.pos.i);

    process.sensitivityList = this.advancePast(')');
    let nextWord = this.getNextWord({consume: false});
    while (nextWord !== 'begin') {
      const variable = new OSignal(this.pos.i);
      variable.constant = false;
      this.expect('variable');
      const name = this.getNextWord();
      let multiSignals: string[] = []; //TODO: Fix this!!
      if (this.text[this.pos.i] == ',') {
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
        const multiSignal = new OSignal();
        Object.assign(variable, multiSignal);
        multiSignal.name = multiSignalName;
        process.variables.push(multiSignal);
      }
      process.variables.push(variable);
      multiSignals = [];
      nextWord = this.getNextWord({consume: false});
    }
    this.expect('begin');
    process.statements = this.parseStatements(['end']);
    this.expect('end');
    this.expect('process');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');
    return process;
  }
  parseStatements(exitConditions: string[]): OStatement[] {
    const statements = [];
    while (this.pos.i < this.text.length) {
      let nextWord = this.getNextWord({consume: false});
      let label;
      if (this.text.substr(this.pos.i + nextWord.length).match(/^\s*:/)) {
          label = nextWord;
          this.getNextWord(); //consume label
          this.expect(':');
          nextWord = this.getNextWord({consume: false});
      }
      if (nextWord == 'if') {
        statements.push(this.parseIf(label));
      } else if (exitConditions.indexOf(nextWord) > -1) {
        break;
      } else if (nextWord.toLowerCase() == 'case') {
        this.getNextWord();
        statements.push(this.parseCase(label));
      } else if (nextWord.toLowerCase() === 'for') {
        statements.push(this.parseFor(label));
      } else {
        const assignmentParser = new AssignmentParser(this.text, this.pos, this.file);
        statements.push(assignmentParser.parse());
      }
    }
    return statements;
  }
  parseFor(label?: string): OForLoop {
    const forLoop = new OForLoop(this.pos.i);
    this.expect('for');
    forLoop.variable = this.getNextWord();
    this.expect('in');
    forLoop.start = this.getNextWord();
    this.expect('to');
    forLoop.end = this.getNextWord();
    this.expect('loop');
    forLoop.statements = this.parseStatements(['end']);
    this.expect('end');
    this.expect('loop');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');
    return forLoop;
  }
  parseIf(label?: string): OIf {
    this.debug(`parseIf`);

    const clause = new OIfClause(this.pos.i);
    const if_ = new OIf();
    this.expect('if');
    clause.condition = this.advancePast('then');
    clause.conditionReads = this.tokenize(clause.condition).filter(token => token.type == 'VARIABLE').map(token => token.value);
    clause.statements = this.parseStatements(['else', 'elsif', 'end']);
    if_.clauses.push(clause);
    let nextWord = this.getNextWord({consume: false});
    while (nextWord === 'elsif') {
      const clause = new OIfClause(this.pos.i);

      this.expect('elsif');
      clause.condition = this.advancePast('then');
      clause.conditionReads = this.tokenize(clause.condition).filter(token => token.type == 'VARIABLE').map(token => token.value);
      clause.statements = this.parseStatements(['else', 'elsif', 'end']);
      if_.clauses.push(clause);
      nextWord = this.getNextWord({consume: false});
    }
    if (nextWord == 'else') {
      this.expect('else');
      if_.elseStatements = this.parseStatements(['end']);
    }
    this.expect('end');
    this.expect('if');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');
    return if_;
  }
  parseCase(label?: string): OCase {
    const case_ = new OCase(this.pos.i);

    case_.variable = this.getNextWord();
    this.expect('is');
    let nextWord = this.getNextWord();
    while (nextWord == 'when') {
      const whenClause = new OWhenClause(this.pos.i);

      whenClause.condition = this.advancePast('=>');
      whenClause.statements = this.parseStatements(['when', 'end']);
      case_.whenClauses.push(whenClause);
      nextWord = this.getNextWord();
    }
    this.expect('case');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');
    return case_
  }
}
