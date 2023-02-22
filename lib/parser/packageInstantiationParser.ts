import { ObjectBase, OFile, OPackageInstantiation } from './objects';
import { ParserBase, ParserState } from './parserBase';
import { AssociationListParser } from './associationListParser';

export class PackageInstantiationParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase | OFile) {
    super(state);
    this.debug(`start`);

  }
  parse(): OPackageInstantiation {
    const inst = new OPackageInstantiation(this.parent, this.state.pos.getRangeToEndLine());
    inst.lexerToken = this.consumeToken();
    this.expect('is');
    this.expect('new');
    this.consumeToken(); // ignore package library
    this.expect('.');
    inst.uninstantiatedPackageToken = this.consumeToken();
    if (this.getToken().getLText() === 'generic') {
      this.consumeToken();
      this.expect('map');
      inst.genericAssociationList = new AssociationListParser(this.state, inst).parse('generic');
    }

    return inst;
  }

}
