import { OLexerToken } from '../lexer';
import { DeclarativePartParser } from './declarative-part-parser';
import { ObjectBase, OIf, OIRange, OProcess } from './objects';
import { ParserPosition } from './parser';
import { ParserBase } from './parser-base';
import { SequentialStatementParser } from './sequential-statement-parser';

export class ProcessParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: ObjectBase) {
    super(pos, file);
    this.debug(`start`);

  }
  parse(startI: number, label?: OLexerToken): OProcess {
    const process = new OProcess(this.parent, new OIRange(this.parent, startI, this.getEndOfLineI()));
    process.lexerToken = label;
    if (this.getToken().getLText() === '(') {
      this.expect('(');
      const sensitivityListTokens = this.advanceClosingParenthese();
      process.sensitivityList.push(...this.extractReads(process, sensitivityListTokens));
    }
    this.maybe('is');
    new DeclarativePartParser(this.pos, this.filePath, process).parse();
    this.expect('begin');
    process.statements = new SequentialStatementParser(this.pos, this.filePath).parse(process, ['end']);
    this.expect('end');
    this.expect('process');
    if (label) {
      this.maybe(label);
    }
    process.range = process.range.copyWithNewEnd(this.pos.i);
    this.expect(';');

    // [\s\S] for . but with newlines
    const resetRegex = /^(?![\s\S]*and|or)[\s\S]*(?:res|rst)[\s\S]*$/i;
    for (const statement of process.statements.filter(s => s instanceof OIf) as OIf[]) {
      for (const clause of statement.clauses) {
        if (clause.condition.find(token => token.getLText() === 'rising_edge' || token.getLText() === 'falling_edge')) {
          process.registerProcess = true;
          // find synchronous resets
          for (const subStatement of clause.statements.filter(s => s instanceof OIf) as OIf[]) {
            for (const subClause of subStatement.clauses) {
              if (subClause.condition.map(a => a.text).join('').match(resetRegex)) { // TODO: Fix
                process.resetClause = subClause;
              }
            }
          }
        }
        // find asynchronous resets
        if (clause.condition.map(a => a.text).join('').match(resetRegex)) {
          process.resetClause = clause;
        }
      }
    }
    return process;
  }
}
