import { ObjectBase, OFile, OPackageInstantiation } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';
import { AssociationListParser } from './association-list-parser';

export class PackageInstantiationParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: ObjectBase | OFile) {
    super(pos, file);
    this.debug(`start`);

  }
  parse(): OPackageInstantiation {
    const inst = new OPackageInstantiation(this.parent, this.pos.getRangeToEndLine());
    inst.lexerToken = this.consumeToken();
    this.expectToken('is');
    this.expectToken('new');
    this.consumeToken(); // ignore package library
    this.expectToken('.');
    inst.uninstantiatedPackageToken = this.consumeToken();
    if (this.getToken().getLText() === 'generic') {
      this.consumeToken();
      this.expectToken('map');
      inst.genericAssociationList = new AssociationListParser(this.pos, this.filePath, inst).parse('generic');
    }

    return inst;
  }

}
