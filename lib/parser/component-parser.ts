import { InterfaceListParser } from './interface-list-parser';
import { IHasComponents, OComponent, OIRange, ParserError } from './objects';
import { ParserPosition } from './parser';
import { ParserBase } from './parser-base';

export class ComponentParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: IHasComponents) {
    super(pos, file);
    this.debug(`start`);
  }
  parse() {
    const component = new OComponent(this.parent, this.getToken().range.copyExtendEndOfLine());
    component.lexerToken = this.consumeToken();
    this.maybeWord('is');

    let lastI;
    while (this.pos.isValid()) {
      this.advanceWhitespace();
      const nextToken = this.getToken();
      const savedI = this.pos.i;
      if (nextToken.getLText() === 'port') {
        this.consumeToken();
        const interfaceListParser = new InterfaceListParser(this.pos, this.filePath, component);
        interfaceListParser.parse(false);
        component.portRange = new OIRange(component, savedI, this.pos.i);
        this.expect(';');
      } else if (nextToken.getLText() === 'generic') {
        this.consumeToken();
        const interfaceListParser = new InterfaceListParser(this.pos, this.filePath, component);
        interfaceListParser.parse(true);
        component.genericRange = new OIRange(component, savedI, this.pos.i);
        this.expect(';');
      } else if (nextToken.getLText() === 'end') {
        this.consumeToken();
        this.expect('component');
        this.maybeWord(component.lexerToken.text);
        component.range = component.range.copyWithNewEnd(this.getToken(-1, true).range.end);
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
