import { ObjectBase, OFile, OPackageInstantiation } from './objects';
import { ParserBase, ParserState } from './parserBase';
import { AssociationListParser } from './associationListParser';

export class PackageInstantiationParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase | OFile) {
    super(state);
    this.debug(`start`);

  }
  parse(): OPackageInstantiation {
    const inst = new OPackageInstantiation(this.parent, this.consumeToken());
    inst.targetLibrary = this.getTargetLibrary();
    this.expect('is');
    this.expect('new');
    inst.uninstantiatedPackage = this.advanceSelectedName(inst);
    if (this.getToken().getLText() === 'generic') {
      this.consumeToken();
      this.expect('map');
      inst.genericAssociationList = new AssociationListParser(this.state, inst).parseGenericAssociations();
    }

    return inst;
  }

}
