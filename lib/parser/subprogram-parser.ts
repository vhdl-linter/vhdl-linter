import { DeclarativePartParser } from './declarative-part-parser';
import { ExpressionParser } from './expression-parser';
import { InterfaceListParser } from './interface-list-parser';
import { ObjectBase, OSubprogram, ParserError } from './objects';
import { ParserBase, ParserState } from './parser-base';
import { SequentialStatementParser } from './sequential-statement-parser';

export class SubprogramParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase) {
    super(state);
    this.debug(`start`);

  }
  parse(): OSubprogram {
    let nextWord = this.consumeToken();
    const startRange = nextWord.range;
    if (nextWord.getLText() === 'impure' || nextWord.getLText() === 'pure') {
      nextWord = this.consumeToken();
    }
    const isFunction = nextWord.getLText() === 'function';
    const token = this.consumeToken();
    const subprogram = new OSubprogram(this.parent, startRange);
    subprogram.lexerToken = token;
    const parameter = this.maybe('parameter');
    if (this.getToken().getLText() === '(') {
      const interfaceListParser = new InterfaceListParser(this.state, subprogram);
      interfaceListParser.parse(false);
    } else {
      if (parameter) {
        throw new ParserError('After Parameter keyword parameter interface list is mandatory', parameter.range);
      }
    }
    if (isFunction) {
      this.expect('return');
      const [tokens] = this.advanceParenthesisAware([';', 'is', ')'], true, false);

      subprogram.return = new ExpressionParser(this.state, subprogram, tokens).parse();
    }
    if (this.getToken().getLText() === 'is') {
      subprogram.hasBody = true;
      this.expect('is');
      new DeclarativePartParser(this.state, subprogram).parse();
      subprogram.statements = new SequentialStatementParser(this.state).parse(subprogram, ['end']);
      this.expect('end');
      this.maybe(isFunction ? 'function' : 'procedure');
      subprogram.endingLexerToken = this.maybe(token);
    }

    subprogram.range = subprogram.range.copyWithNewEnd(this.state.pos.i);

    return subprogram;
  }

}
