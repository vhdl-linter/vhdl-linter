import { OLexerToken } from '../lexer';
import { DeclarativePartParser } from './declarativePartParser';
import { ExpressionParser } from './expressionParser';
import { ObjectBase, OIRange, OProcess } from './objects';
import { ParserBase, ParserState } from './parserBase';
import { SequentialStatementParser } from './sequentialStatementParser';

export class ProcessParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase) {
    super(state);
    this.debug(`start`);

  }
  parse(startI: number, label?: OLexerToken): OProcess {
    const process = new OProcess(this.parent, new OIRange(this.parent, startI, this.getEndOfLineI()));
    process.label = label;
    if (this.getToken().getLText() === '(') {
      this.expect('(');
      const [sensitivityListTokens] = this.advanceParenthesisAware([')']);
      process.sensitivityList.push(...new ExpressionParser(this.state, process, sensitivityListTokens).parse());
    }
    this.maybe('is');
    new DeclarativePartParser(this.state, process).parse();
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
