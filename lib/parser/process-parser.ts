import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position'
export class ProcessParser extends ParserBase {
  constructor(text: string, pos: ParserPosition) {
    super(text, pos);
  }
  parse(label?: string): IProcess {
    this.expect('(');
    const sensitivityList = this.advancePast(')');
    this.expect('begin');
    const statements = this.parseStatements(['end']);
    this.expect('end');
    this.expect('process');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');
    return {
      label,
      sensitivityList,
      statements
    };
  }
  parseStatements(exitConditions: string[]): IStatement[] {
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
        statements.push(this.advancePast(';'));
      }
    }
    return statements;
  }
  parseFor(label?: string): IForLoop {
    this.expect('for');
    let variable = this.getNextWord();
    this.expect('in');
    let start = this.getNextWord();
    this.expect('to');
    let end = this.getNextWord();
    this.expect('loop');
    let statements = this.parseStatements(['end']);
    this.expect('end');
    this.expect('loop');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');
    return {variable, start, end, statements};
  }
  parseIf(label?: string): IIf {
    this.expect('if');
    const clauses: IIfClause[] = [];
    let elseStatements: IStatement[] = [];
    const condition = this.advancePast('then');
    const statements = this.parseStatements(['else', 'elsif', 'end']);
    clauses.push({
      condition,
      statements
    })
    let nextWord = this.getNextWord({consume: false});
    while (nextWord === 'elsif') {
      this.expect('elsif');
      const condition = this.advancePast('then');
      const statements = this.parseStatements(['else', 'elsif', 'end']);
      clauses.push({
        condition,
        statements
      })
      nextWord = this.getNextWord({consume: false});
    }
    if (nextWord == 'else') {
      this.expect('else');
      elseStatements = this.parseStatements(['end']);
    }
    this.expect('end');
    this.expect('if');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');
    return {
      clauses,
      elseStatements
    }
  }
  parseCase(label?: string): ICase {
    const variable = this.getNextWord();
    this.expect('is');
    let nextWord = this.getNextWord();
    let whenClauses: IWhenClause[] = [];
    while (nextWord == 'when') {
      const condition = this.advancePast('=>');
      const statements = this.parseStatements(['when', 'end']);
      whenClauses.push({condition, statements});
      nextWord = this.getNextWord();
    }
    this.expect('case');
    if (label) {
      this.maybeWord(label);
    }
    this.expect(';');
    return {
      variable,
      whenClauses
    }
  }
}
export type IStatement = ICase | string | IIf | IForLoop;
export interface IIf {
  clauses: IIfClause[];
  elseStatements: IStatement[];
}
export interface IIfClause {
  condition: string;
  statements: IStatement[];
}
export interface ICase {
  variable: string;
  whenClauses: IWhenClause[];
}
export interface IWhenClause {
  condition: string;
  statements: IStatement[];
}
export interface IProcess {
  statements: IStatement[];
  sensitivityList: string;
  label?: string;
}
export interface IForLoop {
  variable: string;
  start: string;
  end: string;
  statements: IStatement[];
}
