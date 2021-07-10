import { ParserBase } from './parser-base';
import { OFile, OPackage, OPackageBody } from './objects';
import { DeclarativePartParser } from './declarative-part-parser';

export class PackageParser extends ParserBase {
  parse(parent: OFile): OPackage|OPackageBody {
    const nextWord = this.getNextWord();
    if (nextWord.toLowerCase() == 'body') {
      const pkg = new OPackageBody(parent, this.pos.i, this.getEndOfLineI());
      const match = parent.originalText.match(/!\s*@library\s+(\S+)/i);
      pkg.library = match ? match[1] : undefined;

      pkg.name = this.getNextWord();
      this.expect('is');
      const declarativePartParser = new DeclarativePartParser(this.text, this.pos, this.file, pkg);
      declarativePartParser.parse(false, 'end');
      this.maybeWord('package');
      this.maybeWord('body');
      this.maybeWord(pkg.name);
      this.advanceSemicolon();
      return pkg;
    } else {
      const pkg = new OPackage(parent, this.pos.i, this.getEndOfLineI());
      const match = parent.originalText.match(/!\s*@library\s+(\S+)/i);
      pkg.library = match ? match[1] : undefined;

      pkg.name = nextWord;
      this.expect('is');
      const declarativePartParser = new DeclarativePartParser(this.text, this.pos, this.file, pkg);
      declarativePartParser.parse(false, 'end');
      this.maybeWord('package');
      this.maybeWord(pkg.name);
      this.advanceSemicolon();
      return pkg;
    }
  }

}