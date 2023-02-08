import { OLexerToken } from '../lexer';
import { DeclarativePartParser } from './declarative-part-parser';
import { ExpressionParser } from './expression-parser';
import { ObjectBase, ORange, OProcess, OPosition } from './objects';
import { ParserBase, ParserState } from './parser-base';
import { SequentialStatementParser } from './sequential-statement-parser';

export class ProcessParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase) {
    super(state);
    this.debug(`start`);

  }
  parse(startPos: OPosition, label?: OLexerToken): OProcess {
    const process = new OProcess(this.parent, startPos.getRangeToEndLine());
    process.label = label;
    if (this.getToken().getLText() === '(') {
      this.expect('(');
      const sensitivityListTokens = this.advanceClosingParenthesis();
      process.sensitivityList.push(...new ExpressionParser(this.state, process, sensitivityListTokens).parse());
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
    process.range = process.range.copyWithNewEnd(this.state.pos.pos);
    this.expect(';');
    return process;
  }
}
