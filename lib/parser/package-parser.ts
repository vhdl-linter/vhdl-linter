import { AssociationListParser } from './association-list-parser';
import { DeclarativePartParser } from './declarative-part-parser';
import { InterfaceListParser } from './interface-list-parser';
import { OFile, OIRange, OName, OPackage, OPackageBody } from './objects';
import { ParserBase } from './parser-base';

export class PackageParser extends ParserBase {
  parse(parent: OFile): OPackage|OPackageBody {
    let nextWord = this.consumeToken();
    if (nextWord.getLText() === 'body') {
      const pkg = new OPackageBody(parent, this.getToken().range.extendEndOfLine());
      const match = parent.originalText.match(/!\s*@library\s+(\S+)/i);
      pkg.library = match ? match[1] : undefined;

      const savedI = this.pos.i;
      const name = this.consumeToken();
      pkg.name = new OName(pkg, name.range);
      pkg.name.text = name.text;
      this.expect('is');
      const declarativePartParser = new DeclarativePartParser(this.pos, this.filePath, pkg);
      declarativePartParser.parse(false, 'end');
      this.expect('end');
      this.maybeWord('package');
      this.maybeWord('body');
      this.maybeWord(pkg.name.text);
      pkg.range.end.i = this.pos.i;
      const tokens = this.advanceSemicolonToken();
      return pkg;
    } else {
      const pkg = new OPackage(parent, this.getToken().range.extendEndOfLine());
      const match = parent.originalText.match(/!\s*@library\s+(\S+)/i);
      pkg.library = match ? match[1] : undefined;

      let savedI = this.pos.i;
      pkg.name = new OName(pkg, nextWord.range);
      pkg.name.text = nextWord.text;
      this.expect('is');
      nextWord = this.getToken();
      if (nextWord.getLText() === 'new') {
        this.getNextWord();
        savedI = this.pos.i;
        const uninstantiatedPackageLibrary = this.consumeToken();
        this.expect('.');
        const uninstantiatedPackageName = this.consumeToken();
        pkg.uninstantiatedPackageName = new OName(pkg, uninstantiatedPackageName.range);
        pkg.uninstantiatedPackageName.text = uninstantiatedPackageName.text;

        nextWord = this.getToken();
        if (nextWord.getLText() === 'generic') {
          this.expect('generic');
          this.expect('map');
          pkg.genericAssociationList = new AssociationListParser(this.pos, this.filePath, pkg).parse('generic');
        }
        this.expect(';');
        return pkg;
      }
      if (nextWord.getLText() === 'generic') {
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