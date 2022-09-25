import { ConcurrentStatementParser, ConcurrentStatementTypes } from './concurrent-statement-parser';
import { DeclarativePartParser } from './declarative-part-parser';
import { InterfaceListParser } from './interface-list-parser';
import { OArchitecture, OEntity, OI, OIRange, OName, ParserError, OFile } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';

export class EntityParser extends ParserBase {
  public entity: OEntity;
  constructor(pos: ParserPosition, file: string, private parent: OFile) {
    super(pos, file);
    let library: string | undefined = undefined;
    const match = this.parent.originalText.match(/!\s*@library\s+(\S+)/i);
    library = match ? match[1] : undefined;
    this.entity = new OEntity(this.parent, this.pos.i, this.getEndOfLineI(), library);
    this.debug(`start`);
  }
  parse(): OEntity {
    const preNameI = this.pos.i;
    const nameText = this.getNextWord();
    this.entity.name = new OName(this.entity, preNameI, preNameI + nameText.length);
    this.entity.name.text = nameText;
    if (this.parent instanceof OArchitecture) {
      this.maybeWord('is');
    } else {
      this.expect('is');
    }

    let lastI;
    while (this.pos.isValid()) {
      this.advanceWhitespace();
      let nextWord = this.getNextWord({ consume: false }).toLowerCase();
      const savedI = this.pos.i;
      if (nextWord === 'port') {
        this.getNextWord();
        const interfaceListParser = new InterfaceListParser(this.pos, this.filePath, this.entity);
        interfaceListParser.parse(false);
        this.entity.portRange = new OIRange(this.entity, savedI, this.pos.i);
        this.expect(';');
      } else if (nextWord === 'generic') {
        this.getNextWord();
        const interfaceListParser = new InterfaceListParser(this.pos, this.filePath, this.entity);
        interfaceListParser.parse(true);
        this.entity.genericRange = new OIRange(this.entity, savedI, this.pos.i);
        this.expect(';');
      } else if (nextWord === 'end') {
        this.getNextWord();
        this.maybeWord('entity');
        this.maybeWord(this.entity.name.text);

        this.entity.range.end.i = this.expect(';');
        break;
      } else if (nextWord === 'begin') {
        this.getNextWord();
        let nextWord = this.getNextWord({ consume: false }).toLowerCase();
        while (nextWord !== 'end') {
          new ConcurrentStatementParser(this.pos, this.filePath, this.entity).parse([
            ConcurrentStatementTypes.Assert,
            ConcurrentStatementTypes.ProcedureInstantiation,
            ConcurrentStatementTypes.Process
          ]);
          nextWord = this.getNextWord({ consume: false }).toLowerCase();
        }
        this.getNextWord();
        this.maybeWord('entity');
        this.maybeWord(this.entity.name.text);
        this.entity.range.end.i = this.expect(';');
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
