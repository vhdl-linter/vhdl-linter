import { DeclarativePartParser } from './declarative-part-parser';
import { InterfaceListParser } from './interface-list-parser';
import { OFile, OIRange, OPackage, OPackageBody } from './objects';
import { ParserBase } from './parser-base';

export class PackageParser extends ParserBase {
  parse(parent: OFile): OPackage|OPackageBody {
    let nextToken = this.consumeToken();
    if (nextToken.getLText() === 'body') {
      const pkg = new OPackageBody(parent, this.getToken().range);
      const match = parent.originalText.match(/!\s*@library\s+(\S+)/i);
      pkg.targetLibrary = match ? match[1] : undefined;

      pkg.lexerToken = this.consumeToken();
      this.expectToken('is');
      const declarativePartParser = new DeclarativePartParser(this.pos, this.filePath, pkg);
      declarativePartParser.parse(false, 'end');
      this.expectToken('end');
      this.maybe('package');
      this.maybe('body');
      this.maybe(pkg.lexerToken.text);
      pkg.range = pkg.range.copyWithNewEnd(this.getToken(-1, true).range.end);
      this.advanceSemicolonToken();
      return pkg;
    } else {
      const pkg = new OPackage(parent, this.getToken().range);
      const match = parent.originalText.match(/!\s*@library\s+(\S+)/i);
      pkg.targetLibrary = match ? match[1] : undefined;

      pkg.lexerToken = nextToken;
      this.expectToken('is');
      nextToken = this.getToken();
      // if (nextToken.getLText() === 'new') {
      //   this.getNextWord();
      //   pkg.library = this.consumeToken();
      //   this.expect('.');
      //   pkg.uninstantiatedPackage = this.consumeToken();

      //   nextToken = this.getToken();
      //   if (nextToken.getLText() === 'generic') {
      //     this.expect('generic');
      //     this.expect('map');
      //     pkg.genericAssociationList = new AssociationListParser(this.pos, this.filePath, pkg).parse('generic');
      //   }
      //   pkg.range = pkg.range.copyWithNewEnd(this.getToken(-1, true).range.end);
      //   this.expect(';');
      //   return pkg;
      // }
      if (nextToken.getLText() === 'generic') {
        this.consumeToken();
        const savedI = this.pos.i;
        const interfaceListParser = new InterfaceListParser(this.pos, this.filePath, pkg);
        interfaceListParser.parse(true);
        pkg.genericRange = new OIRange(pkg, savedI, this.pos.i);
        this.expectToken(';');
      }
      const declarativePartParser = new DeclarativePartParser(this.pos, this.filePath, pkg);
      declarativePartParser.parse(false, 'end');
      this.maybe('package');
      this.maybe(pkg.lexerToken.text);
      this.advanceSemicolonToken();
      return pkg;
    }
  }

}