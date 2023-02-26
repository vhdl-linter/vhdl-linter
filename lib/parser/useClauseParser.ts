import { IHasUseClauses } from './interfaces';
import { ObjectBase, OUseClause } from './objects';
import { ParserBase, ParserState } from './parserBase';

export class UseClauseParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase & IHasUseClauses) {
    super(state);
    this.debug(`start`);
  }

  parse() {
    this.expect('use');
    const useClause = new OUseClause(this.parent, this.getToken().range);
    useClause.reference = this.advanceSelectedName(useClause);
    useClause.range = useClause.range.copyWithNewEnd(useClause.reference[useClause.reference.length - 1]!.range);
    this.expect(';');
    return useClause;
  }
}