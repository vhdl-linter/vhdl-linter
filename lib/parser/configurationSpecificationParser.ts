import { ObjectBase, OConfigurationSpecification } from "./objects";
import { ParserBase, ParserState } from "./parserBase";

export class ConfigurationSpecificationParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase) {
    super(state);
    this.debug(`start`);

  }
  parse() {
    const configuration = new OConfigurationSpecification(this.parent, this.getToken().range.copyExtendEndOfLine());
    this.advanceSemicolon(true);
    // optional `end for;`
    if (this.getToken(0, true).getLText() == 'end' && this.getToken(1, true).getLText() == 'for') {
      this.advanceSemicolon();
    }

    return configuration;
  }
}