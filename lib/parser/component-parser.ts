import { InterfaceListParser } from './interface-list-parser';
import { IHasComponents } from './interfaces';
import { OComponent, ORange, ParserError } from './objects';
import { ParserBase, ParserState } from './parser-base';

export class ComponentParser extends ParserBase {
  constructor(state: ParserState, private parent: IHasComponents) {
    super(state);
    this.debug(`start`);
  }
  parse() {
    const component = new OComponent(this.parent, this.getToken().range.copyExtendEndOfLine());
    component.lexerToken = this.consumeToken();
    this.maybe('is');

    let lastI;
    while (this.state.pos.isValid()) {
      this.advanceWhitespace();
      const nextToken = this.getToken();
      const savedI = this.state.pos.pos;
      if (nextToken.getLText() === 'port') {
        this.consumeToken();
        const interfaceListParser = new InterfaceListParser(this.state, component);
        interfaceListParser.parse(false);
        component.portRange = new ORange(component, savedI, this.state.pos.pos);
        this.expect(';');
      } else if (nextToken.getLText() === 'generic') {
        this.consumeToken();
        const interfaceListParser = new InterfaceListParser(this.state, component);
        interfaceListParser.parse(true);
        component.genericRange = new ORange(component, savedI, this.state.pos.pos);
        this.expect(';');
      } else if (nextToken.getLText() === 'end') {
        this.consumeToken();
        this.expect('component');
        this.maybe(component.lexerToken.text);
        component.range = component.range.copyWithNewEnd(this.getToken(-1, true).range.end);
        break;
      }
      if (lastI === this.state.pos.pos) {
        throw new ParserError(`Parser stuck on line ${this.getLine()} in module ${this.constructor.name}`, this.state.pos.getRangeToEndLine());
      }
      lastI = this.state.pos.pos;
    }

    return component;
  }


}
