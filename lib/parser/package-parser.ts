import { AssociationListParser } from './association-list-parser';
import { DeclarativePartParser } from './declarative-part-parser';
import { InterfaceListParser } from './interface-list-parser';
import { OFile, OIRange, OName, OPackage, OPackageBody } from './objects';
import { ParserBase } from './parser-base';

export class PackageParser extends ParserBase {
  parse(parent: OFile): OPackage|OPackageBody {
    let nextWord = this.getNextWord();
    if (nextWord.toLowerCase() === 'body') {
      const pkg = new OPackageBody(parent, this.pos.i, this.getEndOfLineI());
      const match = parent.originalText.match(/!\s*@library\s+(\S+)/i);
      pkg.library = match ? match[1] : undefined;

      const savedI = this.pos.i;
      const name = this.getNextWord();
      pkg.name = new OName(pkg, savedI, savedI + name.length);
      pkg.name.text = name;
      this.expect('is');
      const declarativePartParser = new DeclarativePartParser(this.pos, this.filePath, pkg);
      declarativePartParser.parse(false, 'end');
      this.expect('end');
      this.maybeWord('package');
      this.maybeWord('body');
      this.maybeWord(pkg.name.text);
      this.advanceSemicolonToken();
      return pkg;
    } else {
      const pkg = new OPackage(parent, this.pos.i, this.getEndOfLineI());
      const match = parent.originalText.match(/!\s*@library\s+(\S+)/i);
      pkg.library = match ? match[1] : undefined;

      let savedI = this.pos.i;
      const name = nextWord;
      pkg.name = new OName(pkg, savedI, savedI + name.length);
      pkg.name.text = name;
      this.expect('is');
      nextWord = this.getNextWord({consume: false}).toLowerCase();
      if (nextWord === 'new') {
        this.getNextWord();
        savedI = this.pos.i;
        const uninstantiatedPackageLibrary = this.consumeToken();
        this.expect('.');
        const uninstantiatedPackageName = this.consumeToken();
        pkg.uninstantiatedPackageName = new OName(pkg, savedI, uninstantiatedPackageName.range.end.i);
        pkg.uninstantiatedPackageName.text = uninstantiatedPackageName.text;

        nextWord = this.getNextWord({consume: false}).toLowerCase();
        if (nextWord === 'generic') {
          this.expect('generic');
          this.expect('map');
          pkg.genericAssociationList = new AssociationListParser(this.pos, this.filePath, pkg).parse('generic');
        }
        this.expect(';');
        return pkg;
      }
      if (nextWord === 'generic') {
        this.getNextWord();
        const savedI = this.pos.i;
        const interfaceListParser = new InterfaceListParser(this.pos, this.filePath, pkg);
        interfaceListParser.parse(true);
        pkg.genericRange = new OIRange(pkg, savedI, this.pos.i);
        this.expect(';');
      }
      const declarativePartParser = new DeclarativePartParser(this.pos, this.filePath, pkg);
      declarativePartParser.parse(false, 'end');
      this.maybeWord('package');
      this.maybeWord(pkg.name.text);
      this.advanceSemicolonToken();
      return pkg;
    }
  }

}