import { DeclarativePartParser } from './declarativePartParser';
import { InterfaceListParser } from './interfaceListParser';
import { OFile, OIRange, OPackage, OPackageBody } from './objects';
import { ParserBase } from './parserBase';

export class PackageParser extends ParserBase {
  parse(parent: OFile): OPackage|OPackageBody {
    let nextToken = this.consumeToken();
    if (nextToken.getLText() === 'body') {
      const pkg = new OPackageBody(parent, this.getToken().range);
      pkg.targetLibrary = this.getTargetLibrary();

      pkg.lexerToken = this.consumeToken();
      this.expect('is');
      const declarativePartParser = new DeclarativePartParser(this.state, pkg);
      declarativePartParser.parse(false, 'end');
      this.maybe('package');
      this.maybe('body');
      pkg.endingLexerToken = this.maybe(pkg.lexerToken.text);
      pkg.range = pkg.range.copyWithNewEnd(this.getToken(-1, true).range.end);
      this.advanceSemicolon();
      return pkg;
    } else {
      // package and the identifier have already been consumed. -2 to get the beginning of the package again
      const pkg = new OPackage(parent, this.getToken(-2, true).range);
      pkg.targetLibrary = this.getTargetLibrary();

      pkg.lexerToken = nextToken;
      this.expect('is');
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
        const savedI = this.state.pos.i;
        const interfaceListParser = new InterfaceListParser(this.state, pkg);
        interfaceListParser.parse(true);
        pkg.genericRange = new OIRange(pkg, savedI, this.state.pos.i);
        this.expect(';');
      }
      const declarativePartParser = new DeclarativePartParser(this.state, pkg);
      declarativePartParser.parse(false, 'end');
      this.maybe('package');
      pkg.endingLexerToken = this.maybe(pkg.lexerToken.text);
      pkg.range = pkg.range.copyWithNewEnd(this.getToken().range.end);
      this.expect(';');
      return pkg;
    }
  }

}