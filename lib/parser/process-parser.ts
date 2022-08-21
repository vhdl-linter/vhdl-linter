import { DeclarativePartParser } from './declarative-part-parser';
import { ObjectBase, OI, OIf, OProcess } from './objects';
import { ParserBase } from './parser-base';
import { SequentialStatementParser } from './sequential-statement-parser';
import { ParserPosition } from './parser';

export class ProcessParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: ObjectBase) {
    super(pos, file);
    this.debug(`start`);

  }
  parse(startI: number, label?: string): OProcess {
    const process = new OProcess(this.parent, startI, this.getEndOfLineI());
    process.label = label;
    if (this.getToken().getLText() === '(') {
      this.expect('(');
      const sensitivityListI = this.pos.i;
      const sensitivityListText = this.advanceBrace();
      process.sensitivityList.push(...this.extractReads(process, sensitivityListText, sensitivityListI));
    }
    this.maybeWord('is');
    new DeclarativePartParser(this.pos, this.filePath, process).parse();
    this.expect('begin');
    process.statements = new SequentialStatementParser(this.pos, this.filePath).parse(process, ['end']);
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
