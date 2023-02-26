import { OConfigurationDeclaration, OFile } from "./objects";
import { ParserBase, ParserState } from "./parserBase";

export class ConfigurationDeclarationParser extends ParserBase {
  constructor(state: ParserState, private parent: OFile) {
    super(state);
    this.debug(`start`);

  }
  parse() {
    const configuration = new OConfigurationDeclaration(this.parent, this.getToken().range.copyExtendEndOfLine());
    configuration.targetLibrary = this.parent.originalText.match(/!\s*@library\s+(\S+)/i)?.[1];
    configuration.lexerToken = this.consumeToken();
    this.expect('of');
    configuration.entityName = this.consumeToken();
    while (
      ((this.getToken(0).getLText() === 'end' && this.getToken(1, true).getLText() === ';')
        || (this.getToken(0).getLText() === 'end' && this.getToken(1, true).getLText() === 'configuration'
          && this.getToken(2, true).getLText() === ';')
        || (this.getToken(0).getLText() === 'end' && this.getToken(1, true).getLText() === 'configuration'
          && this.getToken(2, true).getLText() === configuration.lexerToken.getLText() && this.getToken(3, true).getLText() === ';')
        || (this.getToken(0).getLText() === 'end'
          && this.getToken(1, true).getLText() === configuration.lexerToken.getLText() && this.getToken(2, true).getLText() === ';'))
      === false) {
      this.consumeToken(true);
    }
    configuration.range = configuration.range.copyWithNewEnd(this.getToken().range);
    this.advanceSemicolon();
    return configuration;
  }
}