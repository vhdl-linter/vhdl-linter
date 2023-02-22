import { InterfaceListParser } from './interfaceListParser';
import { IHasDeclarations } from './interfaces';
import { ObjectBase, OComponent, OIRange, ParserError } from './objects';
import { ParserBase, ParserState } from './parserBase';

export class ComponentParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase & IHasDeclarations) {
    super(state);
    this.debug(`start`);
  }
  parse() {
    const component = new OComponent(this.parent, this.consumeToken());
    this.maybe('is');

    let lastI;
    while (this.state.pos.isValid()) {
      this.advanceWhitespace();
      const nextToken = this.getToken();
      const savedI = this.state.pos.i;
      if (nextToken.getLText() === 'port') {
        this.consumeToken();
        const interfaceListParser = new InterfaceListParser(this.state, component);
        interfaceListParser.parse(false);
        this.expect(';');
      } else if (nextToken.getLText() === 'generic') {
        this.consumeToken();
        const interfaceListParser = new InterfaceListParser(this.state, component);
        interfaceListParser.parse(true);
        this.expect(';');
      } else if (nextToken.getLText() === 'end') {
        this.consumeToken();
        this.expect('component');
        component.endingReferenceToken = this.maybe(component.lexerToken.text);
        component.range = component.range.copyWithNewEnd(this.getToken(-1, true).range.end);
        break;
      }
      if (lastI === this.state.pos.i) {
        throw new ParserError(`Parser stuck on line ${this.getLine()} in module ${this.constructor.name}`, this.state.pos.getRangeToEndLine());
      }
      lastI = this.state.pos.i;
    }

    return component;
  }


}
