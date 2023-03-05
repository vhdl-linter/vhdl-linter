import { AssociationListParser } from './associationListParser';
import { OEntity, OInstantiation, OLibraryName, OStatementBody, ParserError } from './objects';
import { ParserBase, ParserState } from './parserBase';
import { OLexerToken } from '../lexer';

export class ConcurrentInstantiationParser extends ParserBase {
  constructor(state: ParserState, private parent: OStatementBody | OEntity) {
    super(state);
    this.debug(`start`);

  }
  parse(nextToken: OLexerToken, label?: OLexerToken, postponed = false): OInstantiation {
    const instantiation = new OInstantiation(this.parent, nextToken);
    instantiation.postponed = postponed;
    if (label !== undefined) {
      instantiation.range = instantiation.range.copyWithNewStart(label.range);
    }
    if (nextToken.getLText() === 'entity') {
      this.consumeToken();
      instantiation.type = 'entity';
      instantiation.library = new OLibraryName(instantiation, this.consumeToken());
      this.expect('.');
    } else if (nextToken.getLText() === 'configuration') {
      this.consumeToken();
      instantiation.type = 'configuration';
      instantiation.library = new OLibraryName(instantiation, this.consumeToken());
      this.expect('.');
    } else if (nextToken.getLText() === 'component') {
      this.consumeToken();
      instantiation.type = 'component';
    }
    // all names may have multiple '.' in them...
    // TODO: parse selectedNames for concurrent instantiations
    nextToken = this.consumeToken();
    while (this.getToken().text === '.') {
      instantiation.prefix.push(nextToken);
      this.consumeToken();
      nextToken = this.consumeToken();
    }
    instantiation.entityName = nextToken;
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
        throw new ParserError(`Parser stuck on line ${this.getLine()} in module ${this.constructor.name}`, this.state.pos.getRangeToEndLine());
      }
      lastI = this.state.pos.i;
    }

    instantiation.range = instantiation.range.copyWithNewEnd(this.getToken(-1, true).range.end);
    if ((instantiation.type === 'component' || instantiation.type === 'entity' || instantiation.type === 'configuration') && label === undefined) {
      throw new ParserError(`${instantiation.type} instantiations require a label.`, instantiation.range);
    }
    this.expect(';');
    return instantiation;
  }
}
