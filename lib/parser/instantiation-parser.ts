import { AssociationListParser } from './association-list-parser';
import { OArchitecture, OEntity, OInstantiation, ParserError } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';
import { OLexerToken } from '../lexer';

export class InstantiationParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: OArchitecture | OEntity) {
    super(pos, file);
    this.debug(`start`);

  }
  parse(nextToken: OLexerToken, label: OLexerToken | undefined): OInstantiation {
    const instantiation = new OInstantiation(this.parent, nextToken);
    instantiation.label = label;
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
    if (label !== undefined) {
      instantiation.lexerToken = label;
    } else {
      instantiation.lexerToken = nextToken;
    }

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
        instantiation.portAssociationList = new AssociationListParser(this.pos, this.filePath, instantiation).parse();

      } else if (nextToken.getLText() === 'generic' && instantiation.type !== 'subprogram') {
        if (instantiation.type === 'unknown') {
          instantiation.type = 'component';
        }
        hasGenericMap = true;
        this.consumeToken();
        this.expect('map');
        instantiation.genericAssociationList = new AssociationListParser(this.pos, this.filePath, instantiation).parse('generic');
      } else if (nextToken.getLText() === '(' && !hasGenericMap && !hasPortMap) { // is subprogram call
        instantiation.type = 'subprogram';
        instantiation.portAssociationList = new AssociationListParser(this.pos, this.filePath, instantiation).parse();
      }
      if (lastI === this.pos.i) {
        throw new ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos.getRangeToEndLine());
      }
      lastI = this.pos.i;
    }
    instantiation.range = instantiation.range.copyWithNewEnd(this.getToken(-1, true).range.end);
    this.expect(';');
    return instantiation;
  }
}
