import { ConcurrentStatementParser, ConcurrentStatementTypes } from './concurrent-statement-parser';
import { DeclarativePartParser } from './declarative-part-parser';
import { InterfaceListParser } from './interface-list-parser';
import { OArchitecture, OEntity, ORange, ParserError, OFile } from './objects';
import { ParserBase, ParserState } from './parser-base';

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
    if (this.parent instanceof OArchitecture) {
      this.maybe('is');
    } else {
      this.expect('is');
    }

    let lastI;
    while (this.state.pos.isValid()) {
      this.advanceWhitespace();
      const nextToken = this.getToken();
      const savedI = this.state.pos.pos;
      if (nextToken.getLText() === 'port') {
        this.consumeToken();
        const interfaceListParser = new InterfaceListParser(this.state, this.entity);
        interfaceListParser.parse(false);
        this.entity.portRange = new ORange(this.entity, savedI, this.state.pos.pos);
        this.expect(';');
      } else if (nextToken.getLText() === 'generic') {
        this.consumeToken();
        const interfaceListParser = new InterfaceListParser(this.state, this.entity);
        interfaceListParser.parse(true);
        this.entity.genericRange = new ORange(this.entity, savedI, this.state.pos.pos);
        this.expect(';');
      } else if (nextToken.getLText() === 'end') {
        this.consumeToken();
        this.maybe('entity');
        this.entity.endingLexerToken = this.maybe(this.entity.lexerToken.text);
        this.entity.range = this.entity.range.copyWithNewEnd(this.getToken(-1, true).range.end);
        this.expect(';');
        break;
      } else if (nextToken.getLText() === 'begin') {
        this.consumeToken();
        while (this.getToken().getLText() !== 'end') {
          new ConcurrentStatementParser(this.state, this.entity).parse([
            ConcurrentStatementTypes.Assert,
            ConcurrentStatementTypes.ProcedureInstantiation,
            ConcurrentStatementTypes.Process
          ]);
        }
        this.consumeToken();
        this.maybe('entity');
        this.maybe(this.entity.lexerToken.text);
        this.entity.range = this.entity.range.copyWithNewEnd(this.getToken(-1, true).range.end);
        this.expect(';');
        break;

      } else {
        new DeclarativePartParser(this.state, this.entity).parse(true);
      }
      if (lastI === this.state.pos.pos) {
        throw new ParserError(`Parser stuck on line ${this.getLine()} in module ${this.constructor.name}`, this.state.pos.getRangeToEndLine());
      }
      lastI = this.state.pos.pos;
    }

    return this.entity;
  }


}
