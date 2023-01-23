import { OAttribute, ObjectBase } from "./objects";
import { ParserBase, ParserState } from "./parser-base";

export class AttributeParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase ) {
    super(state);
    this.debug(`start`);

  }
  parse(): OAttribute {
    this.expect('attribute');
    const attribute = new OAttribute(this.parent, this.state.pos.getRangeToEndLine());
    attribute.lexerToken = this.consumeToken();
    this.advanceSemicolon(true);

    return attribute;
  }

}
