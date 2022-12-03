import { OLexerToken } from '../lexer';
import { DeclarativePartParser } from './declarative-part-parser';
import { ObjectBase, OIRange, OProcess } from './objects';
import { ParserBase, ParserState } from './parser-base';
import { SequentialStatementParser } from './sequential-statement-parser';

export class ProcessParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase) {
    super(state);
    this.debug(`start`);

  }
  parse(startI: number, label?: OLexerToken): OProcess {
    const process = new OProcess(this.parent, new OIRange(this.parent, startI, this.getEndOfLineI()));
    process.lexerToken = label;
    if (this.getToken().getLText() === '(') {
      this.expect('(');
      const sensitivityListTokens = this.advanceClosingParenthesis();
      process.sensitivityList.push(...this.parseExpression(process, sensitivityListTokens));
    }
    this.maybe('is');
    new DeclarativePartParser(this.state, process).parse();
    this.expect('begin');
    process.statements = new SequentialStatementParser(this.state).parse(process, ['end']);
    this.expect('end');
    this.expect('process');
    if (label) {
      this.maybe(label);
    }
    process.range = process.range.copyWithNewEnd(this.state.pos.i);
    this.expect(';');
    return process;
  }
}
