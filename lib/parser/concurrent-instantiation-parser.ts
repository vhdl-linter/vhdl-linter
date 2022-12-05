import { AssociationListParser } from './association-list-parser';
import { OEntity, OInstantiation, OStatementBody, ParserError } from './objects';
import { ParserBase, ParserState } from './parser-base';
import { OLexerToken } from '../lexer';

export class ConcurrentInstantiationParser extends ParserBase {
  constructor(state: ParserState, private parent: OStatementBody | OEntity) {
    super(state);
    this.debug(`start`);

  }
  parse(nextToken: OLexerToken, label: OLexerToken | undefined): OInstantiation {
    const instantiation = new OInstantiation(this.parent, nextToken);
    if (nextToken.getLText() === 'entity') {
      this.consumeToken();
      instantiation.type = 'entity';
      instantiation.library = this.consumeToken();
      this.expect('.');
    } else if (nextToken.getLText() === 'component') {
      this.consumeToken();
      instantiation.type = 'component';
    }
    // all names may have multiple '.' in them...
    nextToken = this.consumeToken();
    while (this.getToken().text === '.') {
      this.consumeToken();
      nextToken = this.consumeToken();
    }
    instantiation.componentName = nextToken;
    instantiation.label = label;

    if (instantiation.type === 'entity' && this.getToken().getLText() === '(') {
      this.expect('(');
      instantiation.archIdentifier = this.consumeToken();
      this.expect(')');
    }

    let hasPortMap = false;
    let hasGenericMap = false;
    let lastI;
    while (this.getToken().getLText() !== ';') {
      nextToken = this.getToken();
      if (nextToken.getLText() === 'port' && instantiation.type !== 'subprogram') {
        if (instantiation.type === 'unknown') {
          instantiation.type = 'component';
        }
        hasPortMap = true;
        this.consumeToken();
        this.expect('map');
        instantiation.portAssociationList = new AssociationListParser(this.state, instantiation).parse();

      } else if (nextToken.getLText() === 'generic' && instantiation.type !== 'subprogram') {
        if (instantiation.type === 'unknown') {
          instantiation.type = 'component';
        }
        hasGenericMap = true;
        this.consumeToken();
        this.expect('map');
        instantiation.genericAssociationList = new AssociationListParser(this.state, instantiation).parse('generic');
      } else if (nextToken.getLText() === '(' && !hasGenericMap && !hasPortMap) { // is subprogram call
        instantiation.portAssociationList = new AssociationListParser(this.state, instantiation).parse();
      }

      if (lastI === this.state.pos.i) {
        throw new ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.state.pos.getRangeToEndLine());
      }
      lastI = this.state.pos.i;
    }

    instantiation.range = instantiation.range.copyWithNewEnd(this.getToken(-1, true).range.end);
    if ((instantiation.type === 'component' || instantiation.type === 'entity') && label === undefined) {
      throw new ParserError(`${instantiation.type} instantiations require a label.`, instantiation.range);
    }
    this.expect(';');
    return instantiation;
  }
}
