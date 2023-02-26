import { DeclarativePartParser } from './declarativePartParser';
import { InterfaceListParser } from './interfaceListParser';
import { ObjectBase, OFile, OIRange, OPackage, OPackageBody } from './objects';
import { ParserBase } from './parserBase';

export class PackageParser extends ParserBase {
  parse(parent: OFile | ObjectBase): OPackage | OPackageBody {
    if (this.getToken().getLText() === 'body') {
      return this.parsePackageBody(parent);
    }
    return this.parsePackage(parent);
  }
  parsePackage(parent: OFile | ObjectBase): OPackage {
    // package and the identifier have already been consumed. -2 to get the beginning of the package again
    const pkg = new OPackage(parent, this.getToken(-1, true).range);
    const match = this.state.pos.file.originalText.match(/!\s*@library\s+(\S+)/i);
    pkg.targetLibrary = match ? match[1] : undefined;

    pkg.lexerToken = this.consumeIdentifier();
    this.expect('is');
    const nextToken = this.getToken();
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
  parsePackageBody(parent: OFile | ObjectBase): OPackageBody {
    this.expect('body');
    const pkg = new OPackageBody(parent, this.getToken().range);
    const match = this.state.pos.file.originalText.match(/!\s*@library\s+(\S+)/i);
    pkg.targetLibrary = match ? match[1] : undefined;

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

  }


}