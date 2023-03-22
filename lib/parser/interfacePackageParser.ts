import { ObjectBase, OFile, OInterfacePackage } from './objects';
import { ParserBase, ParserState } from './parserBase';
import { AssociationListParser } from './associationListParser';

export class InterfacePackageParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase | OFile) {
    super(state);
    this.debug(`start`);

  }
  parse(): OInterfacePackage {
    const inst = new OInterfacePackage(this.parent, this.state.pos.getRangeToEndLine());
    inst.lexerToken = this.consumeToken();
    this.expect('is');
    this.expect('new');
    inst.uninstantiatedPackage = this.advanceSelectedName(inst);
    if (this.getToken().getLText() === 'generic') {
      this.consumeToken();
      this.expect('map');
      if (this.getToken(1, true).getLText() === '<>') {
        this.expect('(');
        this.expect('<>');
        this.expect(')');
      } else {
        inst.genericAssociationList = new AssociationListParser(this.state, inst).parseGenericAssociations();
      }
    }

    return inst;
  }

}
