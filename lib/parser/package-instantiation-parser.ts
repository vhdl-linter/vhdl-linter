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
    this.expect('is');
    this.expect('new');
    this.consumeToken(); // ignore package library
    this.expect('.');
    inst.uninstantiatedPackageToken = this.consumeToken();
    const nextWord = this.getNextWord({consume: false});
    if (nextWord === 'generic') {
      this.consumeToken();
      this.expect('map');
      inst.genericAssociationList = new AssociationListParser(this.pos, this.filePath, inst).parse('generic');
    }

    return inst;
  }

}
