import { OInstantiation, OAssociation, OGenericAssociationList as OGenericAssociationList, OIRange, OPortAssociationList as OPortAssotiationList, ParserError, OPackage, OPackageInstantiation } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';
import { OLexerToken } from '../lexer';


export class AssociationListParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: OInstantiation | OPackage | OPackageInstantiation) {
    super(pos, file);
    this.debug(`start`);
  }
  findFormal(associationTokens: OLexerToken[]) {
    // associationTokens.findIndex(token => token.text === '=>');
    let braceLevel = 0;
    for (const [index, token] of associationTokens.entries()) {
      if (token.getLText() === '(') {
        braceLevel++;
      } else if (token.getLText() === ')') {
        braceLevel--;
      } else if (braceLevel === 0 && token.getLText() === '=>') {
        return index;
      }
    }
    return -1;
  }
  parse(type: 'port' | 'generic' = 'port') {
    const braceToken = this.expectToken('(');

    const list = type === 'generic' ? new OGenericAssociationList(this.parent, braceToken.range) : new OPortAssotiationList(this.parent, braceToken.range);

    while (this.pos.isValid()) {
      const savedI = this.pos.i;
      // let associationString = this.advancePast(/[,)]/, {returnMatch: true});
      // eslint-disable-next-line prefer-const
      let [associationTokens, lastChar] = this.advanceBraceAwareToken([',', ')']);
      if (associationTokens.length > 0) {
        const association = new OAssociation(list, new OIRange(list, savedI, associationTokens[0]?.range?.end?.i ?? savedI));
        const index = this.findFormal(associationTokens);
        if (index > -1) {
          const formalTokens = associationTokens.slice(0, index);
          const actualTokens = associationTokens.slice(index + 1);
          association.formalPart = this.extractReads(association, formalTokens, true);
          associationTokens = actualTokens;
        }
        if (associationTokens[0].getLText() !== 'open') {
          association.actualIfInput = this.extractReads(association, associationTokens);
          if (type === 'port') {
            association.actualIfOutput = this.extractReadsOrWrite(association, associationTokens);
            association.actualIfInoutput = this.extractReadsOrWrite(association, associationTokens, true);
          }
        } else {
          association.actualIfInput = [];
          association.actualIfOutput = [[], []];
          association.actualIfInoutput = [[], []];
        }
        list.children.push(association);
      }
      if (lastChar.text === ',') {
        if (this.getToken().getLText() === ')') {
          throw new ParserError(`Unexpected ',' at end of association list`, this.getToken().range.copyExtendBeginningOfLine());
        }
      } else if (lastChar.text === ')') {
        list.range = list.range.copyWithNewEnd(this.pos.i);
        break;
      }
    }
    return list;
  }
}