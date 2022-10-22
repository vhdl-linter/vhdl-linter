import { ConcurrentStatementParser, ConcurrentStatementTypes } from './concurrent-statement-parser';
import { DeclarativePartParser } from './declarative-part-parser';
import { InterfaceListParser } from './interface-list-parser';
import { OArchitecture, OEntity, OIRange, ParserError, OFile } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';

export class EntityParser extends ParserBase {
  public entity: OEntity;
  constructor(pos: ParserPosition, file: string, private parent: OFile) {
    super(pos, file);
    let library: string | undefined = undefined;
    const match = this.parent.originalText.match(/!\s*@library\s+(\S+)/i);
    library = match ? match[1] : undefined;
    this.entity = new OEntity(this.parent, this.getToken().range.copyExtendEndOfLine(), library);
    this.debug(`start`);
  }
  parse(): OEntity {
    this.entity.lexerToken = this.consumeToken();
    if (this.parent instanceof OArchitecture) {
      this.maybeWord('is');
    } else {
      this.expectToken('is');
    }

    let lastI;
    while (this.pos.isValid()) {
      this.advanceWhitespace();
      const nextToken = this.getToken();
      const savedI = this.pos.i;
      if (nextToken.getLText() === 'port') {
        this.consumeToken();
        const interfaceListParser = new InterfaceListParser(this.pos, this.filePath, this.entity);
        interfaceListParser.parse(false);
        this.entity.portRange = new OIRange(this.entity, savedI, this.pos.i);
        this.expectToken(';');
      } else if (nextToken.getLText() === 'generic') {
        this.consumeToken();
        const interfaceListParser = new InterfaceListParser(this.pos, this.filePath, this.entity);
        interfaceListParser.parse(true);
        this.entity.genericRange = new OIRange(this.entity, savedI, this.pos.i);
        this.expectToken(';');
      } else if (nextToken.getLText() === 'end') {
        this.consumeToken();
        this.maybeWord('entity');
        this.maybeWord(this.entity.lexerToken.text);
        this.entity.range = this.entity.range.copyWithNewEnd(this.getToken(-1, true).range.end);
        this.expectToken(';');
        break;
      } else if (nextToken.getLText() === 'begin') {
        this.consumeToken();
        while (this.getToken().getLText() !== 'end') {
          new ConcurrentStatementParser(this.pos, this.filePath, this.entity).parse([
            ConcurrentStatementTypes.Assert,
            ConcurrentStatementTypes.ProcedureInstantiation,
            ConcurrentStatementTypes.Process
          ]);
        }
        this.consumeToken();
        this.maybeWord('entity');
        this.maybeWord(this.entity.lexerToken.text);
        this.entity.range = this.entity.range.copyWithNewEnd(this.getToken(-1, true).range.end);
        this.expectToken(';');
        break;

      } else {
        new DeclarativePartParser(this.pos, this.filePath, this.entity).parse(true);
      }
      if (lastI === this.pos.i) {
        throw new ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos.getRangeToEndLine());
      }
      lastI = this.pos.i;
    }

    return this.entity;
  }


}
