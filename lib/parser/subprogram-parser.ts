import { DeclarativePartParser } from './declarative-part-parser';
import { InterfaceListParser } from './interface-list-parser';
import { ObjectBase, OI, OName, OSubprogram } from './objects';
import { ParserBase } from './parser-base';
import { SequentialStatementParser } from './sequential-statement-parser';
import { ParserPosition } from './parser';

export class SubprogramParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: ObjectBase) {
    super(pos, file);
    this.debug(`start`);

  }
  parse(startI: number): OSubprogram {
    let nextWord = this.getNextWord();
    if (nextWord === 'impure' || nextWord === 'pure') {
      nextWord = this.getNextWord();
    }
    const isFunction = nextWord === 'function';
    const beforeNameI = this.pos.i;
    const name = this.getNextWord();
    const subprogram = new OSubprogram(this.parent, startI, this.getEndOfLineI());
    subprogram.name = new OName(subprogram, beforeNameI, beforeNameI + name.length);
    subprogram.name.text = name;

    if (this.getToken().getLText() === '(') {
      const interfaceListParser = new InterfaceListParser(this.pos, this.filePath, subprogram);
      interfaceListParser.parse(false);
    }
    if (isFunction) {
      this.expect('return');
      subprogram.return = this.getType(subprogram, false, true).typeReads;
    }
    nextWord = this.getNextWord({ consume: false });
    if (nextWord === 'is') {
      this.expect('is');
      new DeclarativePartParser(this.pos, this.filePath, subprogram).parse();
      this.expect('begin');
      subprogram.statements = new SequentialStatementParser(this.pos, this.filePath).parse(subprogram, ['end']);
      this.expect('end');
      this.maybeWord(isFunction ? 'function' : 'procedure');
      this.maybeWord(name);
      subprogram.range.end.i = this.pos.i;

    }

    return subprogram;
  }

}
