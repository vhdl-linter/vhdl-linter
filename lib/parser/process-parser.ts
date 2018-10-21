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
      console.log('asdasd', nextWord);
      if (nextWord == 'if') {
        statements.push(this.parseIf());
      } else if (exitConditions.indexOf(nextWord) > -1) {
        break;
      } else if (nextWord == 'case') {
        this.getNextWord();
        statements.push(this.parseCase());
      } else {
        statements.push(this.advancePast(';'));
      }
    }
    return statements;
  }
  parseIf(): IIf {
    console.log('asdhuoi', this.text.substr(this.pos.i, 2));
    this.expect('if');
    console.log('asdhuoi2', this.text.substr(this.pos.i, 2));
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
    this.expect(';');
    console.log(clauses, 'clauses');
    return {
      clauses,
      elseStatements
    }
  }
  parseCase(): ICase {
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
    console.log(whenClauses, 'whenClauses')
    this.expect('case');
    this.expect(';');
    return {
      variable,
      whenClauses
    }
  }
}
export type IStatement = ICase | string | IIf;
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
