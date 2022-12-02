import { DeclarativePartParser } from './declarative-part-parser';
import { InterfaceListParser } from './interface-list-parser';
import { ObjectBase, OSubprogram } from './objects';
import { ParserBase, ParserState } from './parser-base';
import { SequentialStatementParser } from './sequential-statement-parser';

export class SubprogramParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase) {
    super(state);
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
      const interfaceListParser = new InterfaceListParser(this.state, subprogram);
      interfaceListParser.parse(false);
    }
    if (isFunction) {
      this.expect('return');
      subprogram.return = this.getType(subprogram, false, true).typeReads;
    }
    if (this.getToken().getLText() === 'is') {
      subprogram.hasBody = true;
      this.expect('is');
      new DeclarativePartParser(this.state, subprogram).parse();
      this.expect('begin');
      subprogram.statements = new SequentialStatementParser(this.state).parse(subprogram, ['end']);
      this.expect('end');
      this.maybe(isFunction ? 'function' : 'procedure');
      this.maybe(token.text);
      subprogram.range = subprogram.range.copyWithNewEnd(this.state.pos.i);
      
    }

    return subprogram;
  }

}
