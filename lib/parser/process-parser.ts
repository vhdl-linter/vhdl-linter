import { OProcess, OIf, ObjectBase, OI } from './objects';
import { ProcessLikeParser } from './process-like-parse';
import { DeclarativePartParser } from './declarative-part-parser';

export class ProcessParser extends ProcessLikeParser {
  constructor(text: string, pos: OI, file: string, private parent: ObjectBase) {
    super(text, pos, file);
    this.debug(`start`);

  }
  parse(startI: number, label?: string): OProcess {
    const process = new OProcess(this.parent, startI, this.getEndOfLineI());
    process.label = label;
    if (this.text[this.pos.i] === '(') {
      this.expect('(');
      const sensitivityListI = this.pos.i;
      const sensitivityListText = this.advanceBrace();
      process.sensitivityList.push(...this.extractReads(process, sensitivityListText, sensitivityListI));
    }
    this.maybeWord('is');
    new DeclarativePartParser(this.text, this.pos, this.file, process).parse();
    this.expect('begin');
    process.statements = this.parseStatements(process, ['end']);
    this.expect('end');
    this.expect('process');
    if (label) {
      this.maybeWord(label);
    }
    process.range.end.i = this.pos.i;
    this.expect(';');
    
    // [\s\S] for . but with newlines
    const resetRegex = /^(?![\s\S]*and|or)[\s\S]*(?:res|rst)[\s\S]*$/i;
    for (const statement of process.statements.filter(s => s instanceof OIf) as OIf[]) {
      for (const clause of statement.clauses) {
        if (clause.condition.match(/rising_edge|falling_edge/i)) {
          process.registerProcess = true;
          // find synchronous resets
          for (const subStatement of clause.statements.filter(s => s instanceof OIf) as OIf[]) {
            for (const subClause of subStatement.clauses) {
              if (subClause.condition.match(resetRegex)) {
                process.resetClause = subClause;
              }
            }
          }
        }
        // find asynchronous resets
        if (clause.condition.match(resetRegex)) {
          process.resetClause = clause;
        }
      }
    }
    return process;
  }
}
