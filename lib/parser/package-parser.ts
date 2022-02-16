import { DeclarativePartParser } from './declarative-part-parser';
import { InterfaceListParser } from './interface-list-parser';
import { OFile, OIRange, OName, OPackage, OPackageBody } from './objects';
import { ParserBase } from './parser-base';

export class PackageParser extends ParserBase {
  parse(parent: OFile): OPackage|OPackageBody {
    let nextWord = this.getNextWord();
    if (nextWord.toLowerCase() == 'body') {
      const pkg = new OPackageBody(parent, this.pos.i, this.getEndOfLineI());
      const match = parent.originalText.match(/!\s*@library\s+(\S+)/i);
      pkg.library = match ? match[1] : undefined;

      const savedI = this.pos.i;
      const name = this.getNextWord();
      pkg.name = new OName(pkg, savedI, savedI + name.length);
      pkg.name.text = name;
      this.expect('is');
      const declarativePartParser = new DeclarativePartParser(this.text, this.pos, this.file, pkg);
      declarativePartParser.parse(false, 'end');
      this.maybeWord('package');
      this.maybeWord('body');
      this.maybeWord(pkg.name.text);
      this.advanceSemicolon();
      return pkg;
    } else {
      const pkg = new OPackage(parent, this.pos.i, this.getEndOfLineI());
      const match = parent.originalText.match(/!\s*@library\s+(\S+)/i);
      pkg.library = match ? match[1] : undefined;

      const savedI = this.pos.i;
      const name = nextWord;
      pkg.name = new OName(pkg, savedI, savedI + name.length);
      pkg.name.text = name;
      this.expect('is');
      nextWord = this.getNextWord({consume: false}).toLowerCase();
      if (nextWord === 'generic') {
        this.getNextWord();
        const savedI = this.pos.i;
        const interfaceListParser = new InterfaceListParser(this.text, this.pos, this.file, pkg);
        interfaceListParser.parse(true);
        pkg.genericRange = new OIRange(pkg, savedI, this.pos.i);
        this.expect(';');
      }
      const declarativePartParser = new DeclarativePartParser(this.text, this.pos, this.file, pkg);
      declarativePartParser.parse(false, 'end');
      this.maybeWord('package');
      this.maybeWord(pkg.name.text);
      this.advanceSemicolon();
      return pkg;
    }
  }

}