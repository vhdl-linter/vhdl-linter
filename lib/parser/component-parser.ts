import { ConcurrentStatementParser, ConcurrentStatementTypes } from './concurrent-statement-parser';
import { DeclarativePartParser } from './declarative-part-parser';
import { InterfaceListParser } from './interface-list-parser';
import { IHasComponents, OArchitecture, OComponent, OEntity, OFileWithEntity, OI, OIRange, OName, ParserError } from './objects';
import { ParserBase } from './parser-base';

export class ComponentParser extends ParserBase {
  constructor(text: string, pos: OI, file: string, private parent: IHasComponents) {
    super(text, pos, file);
    this.debug(`start`);
  }
  parse() {
    const component = new OComponent(this.parent, this.pos.i, this.getEndOfLineI());
    const preNameI = this.pos.i;
    const nameText = this.getNextWord();
    component.name = new OName(component, preNameI, preNameI + nameText.length);
    component.name.text = nameText;
    this.maybeWord('is');

    let lastI;
    while (this.pos.i < this.text.length) {
      if (this.text[this.pos.i].match(/\s/)) {
        this.pos.i++;
        continue;
      }
      let nextWord = this.getNextWord({ consume: false }).toLowerCase();
      const savedI = this.pos.i;
      if (nextWord === 'port') {
        this.getNextWord();
        const interfaceListParser = new InterfaceListParser(this.text, this.pos, this.file, component);
        interfaceListParser.parse(false);
        component.portRange = new OIRange(component, savedI, this.pos.i);
        this.expect(';');
      } else if (nextWord === 'generic') {
        this.getNextWord();
        const interfaceListParser = new InterfaceListParser(this.text, this.pos, this.file, component);
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
