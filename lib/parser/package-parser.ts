import { ParserBase } from './parser-base';
import { OFile, OPackage } from './objects';
import { DeclarativePartParser } from './declarative-part-parser';

export class PackageParser extends ParserBase {
  parse(parent: OFile): OPackage {
    const pkg = new OPackage(parent, this.pos.i, this.getEndOfLineI());
    const match = parent.originalText.match(/!\s*@library\s+(\S+)/i);
    pkg.library = match ? match[1] : undefined;

    pkg.name = this.getNextWord();
    this.expect('is');
    const declarativePartParser = new DeclarativePartParser(this.text, this.pos, this.file, pkg);
    declarativePartParser.parse(false, 'end');
    this.maybeWord(pkg.name);
    this.advanceSemicolon();
    return pkg;
  }

}