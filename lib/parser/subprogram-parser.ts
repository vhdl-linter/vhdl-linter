import { DeclarativePartParser } from './declarative-part-parser';
import { InterfaceListParser } from './interface-list-parser';
import { ObjectBase, OSubprogram } from './objects';
import { ParserBase } from './parser-base';
import { SequentialStatementParser } from './sequential-statement-parser';
import { ParserPosition } from './parser';

export class SubprogramParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: ObjectBase) {
    super(pos, file);
    this.debug(`start`);

  }
  parse(): OSubprogram {
    let nextWord = this.consumeToken();
    if (nextWord.getLText() === 'impure' || nextWord.getLText() === 'pure') {
      nextWord = this.consumeToken();
    }
    const isFunction = nextWord.getLText() === 'function';
    const token = this.consumeToken();
    const subprogram = new OSubprogram(this.parent, nextWord.range.copyExtendEndOfLine());
    subprogram.lexerToken = token;

    if (this.getToken().getLText() === '(') {
      const interfaceListParser = new InterfaceListParser(this.pos, this.filePath, subprogram);
      interfaceListParser.parse(false);
    }
    if (isFunction) {
      this.expect('return');
      subprogram.return = this.getType(subprogram, false, true).typeReads;
    }
    if (this.getToken().getLText() === 'is') {
      this.expect('is');
      new DeclarativePartParser(this.pos, this.filePath, subprogram).parse();
      this.expect('begin');
      subprogram.statements = new SequentialStatementParser(this.pos, this.filePath).parse(subprogram, ['end']);
      this.expect('end');
      this.maybeWord(isFunction ? 'function' : 'procedure');
      this.maybeWord(token.text);
      subprogram.range = subprogram.range.copyWithNewEnd(this.pos.i);

    }

    return subprogram;
  }

}
