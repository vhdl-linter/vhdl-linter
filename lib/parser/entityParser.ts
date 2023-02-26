import { ConcurrentStatementParser, ConcurrentStatementTypes } from './concurrentStatementParser';
import { DeclarativePartParser } from './declarativePartParser';
import { InterfaceListParser } from './interfaceListParser';
import { OArchitecture, OEntity, OFile, ParserError } from './objects';
import { ParserBase, ParserState } from './parserBase';

export class EntityParser extends ParserBase {
  public entity: OEntity;
  constructor(state: ParserState, private parent: OFile) {
    super(state);
    let library: string | undefined = undefined;
    const match = this.parent.originalText.match(/!\s*@library\s+(\S+)/i);
    library = match ? match[1] : undefined;
    this.entity = new OEntity(this.parent, this.getToken(-1, true).range.copyExtendEndOfLine(), library);
    this.debug(`start`);
  }
  parse(): OEntity {
    this.entity.lexerToken = this.consumeIdentifier();
    this.expect('is');

    let lastI;
    while (this.state.pos.isValid()) {
      this.advanceWhitespace();
      const nextToken = this.getToken();
      if (nextToken.getLText() === 'port') {
        this.consumeToken();
        const interfaceListParser = new InterfaceListParser(this.state, this.entity);
        interfaceListParser.parse(false);
        this.expect(';');
      } else if (nextToken.getLText() === 'generic') {
        this.consumeToken();
        const interfaceListParser = new InterfaceListParser(this.state, this.entity);
        interfaceListParser.parse(true);
        this.expect(';');
      } else if (nextToken.getLText() === 'end') {
        this.consumeToken();
        this.maybe('entity');
        this.entity.endingLexerToken = this.maybe(this.entity.lexerToken.text);
        this.entity.range = this.entity.range.copyWithNewEnd(this.getToken(-1, true).range.end);
        this.expect(';');
        break;
      } else if (nextToken.getLText() === 'begin') {
        const statementStart = this.getToken().range;
        this.consumeToken();
        while (this.getToken().getLText() !== 'end') {
          new ConcurrentStatementParser(this.state, this.entity).parse([
            ConcurrentStatementTypes.Assert,
            ConcurrentStatementTypes.ProcedureInstantiation,
            ConcurrentStatementTypes.Process
          ]);
        }
        this.entity.statementsRange = statementStart.copyWithNewEnd(this.getToken().range);
        this.consumeToken();
        this.maybe('entity');
        this.maybe(this.entity.lexerToken.text);
        this.entity.range = this.entity.range.copyWithNewEnd(this.getToken(-1, true).range.end);
        this.expect(';');
        break;

      } else {
        new DeclarativePartParser(this.state, this.entity).parse(true, 'begin', false);
      }
      if (lastI === this.state.pos.i) {
        throw new ParserError(`Parser stuck on line ${this.getLine()} in module ${this.constructor.name}`, this.state.pos.getRangeToEndLine());
      }
      lastI = this.state.pos.i;
    }

    return this.entity;
  }


}
