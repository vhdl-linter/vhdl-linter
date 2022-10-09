import { ConcurrentStatementParser, ConcurrentStatementTypes } from './concurrent-statement-parser';
import { DeclarativePartParser } from './declarative-part-parser';
import { InterfaceListParser } from './interface-list-parser';
import { IHasComponents, OArchitecture, OComponent, OEntity, OI, OIRange, OName, ParserError } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';

export class ComponentParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: IHasComponents) {
    super(pos, file);
    this.debug(`start`);
  }
  parse() {
    const component = new OComponent(this.parent, this.getToken().range.copyExtendEndOfLine());
    const nameText = this.consumeToken();
    component.name = new OName(component, nameText.range);
    component.name.text = nameText.text;
    this.maybeWord('is');

    let lastI;
    while (this.pos.isValid()) {
      this.advanceWhitespace();
      let nextWord = this.getNextWord({ consume: false }).toLowerCase();
      const savedI = this.pos.i;
      if (nextWord === 'port') {
        this.getNextWord();
        const interfaceListParser = new InterfaceListParser(this.pos, this.filePath, component);
        interfaceListParser.parse(false);
        component.portRange = new OIRange(component, savedI, this.pos.i);
        this.expect(';');
      } else if (nextWord === 'generic') {
        this.getNextWord();
        const interfaceListParser = new InterfaceListParser(this.pos, this.filePath, component);
        interfaceListParser.parse(true);
        component.genericRange = new OIRange(component, savedI, this.pos.i);
        this.expect(';');
      } else if (nextWord === 'end') {
        this.getNextWord();
        this.expect('component');
        this.maybeWord(component.name.text);

        component.range.end.i = this.expect(';');
        break;
      }
      if (lastI === this.pos.i) {
        throw new ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos.getRangeToEndLine());
      }
      lastI = this.pos.i;
    }

    return component;
  }


}
