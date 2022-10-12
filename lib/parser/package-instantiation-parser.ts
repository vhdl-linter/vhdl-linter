import { ObjectBase, OName, OPackageInstantiation } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';
import { AssociationListParser } from './association-list-parser';

export class PackageInstantiationParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: ObjectBase) {
    super(pos, file);
    this.debug(`start`);

  }
  parse(): OPackageInstantiation {
    const inst = new OPackageInstantiation(this.parent, this.pos.getRangeToEndLine());
    this.expect('package');
    const name = this.consumeToken();
    inst.name = new OName(inst, name);
    inst.name.text = name.text;
    this.expect('is');
    this.expect('new');
    this.consumeToken(); // ignore package library
    this.expect('.');
    const uninstantiatedPackageName = this.consumeToken();
    inst.uninstantiatedPackageName = new OName(inst, uninstantiatedPackageName);
    inst.uninstantiatedPackageName.text = uninstantiatedPackageName.text;
    const nextWord = this.getNextWord({consume: false});
    if (nextWord === 'generic') {
      this.consumeToken();
      this.expect('map');
      inst.genericAssociationList = new AssociationListParser(this.pos, this.filePath, inst).parse('generic');
    }

    return inst;
  }

}
