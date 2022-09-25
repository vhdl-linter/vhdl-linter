import { OI, OInstantiation, OAssociation, OAssociationFormal, OGenericAssociationList as OGenericAssociationList, OIRange, OPortAssociationList as OPortAssotiationList, ParserError, OPackage } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';


export class AssociationListParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: OInstantiation|OPackage) {
    super(pos, file);
    this.debug(`start`);
  }
  parse(type: 'port' | 'generic' = 'port') {
    const savedI = this.pos.i;
    this.expect('(');

    const list = type === 'generic' ? new OGenericAssociationList(this.parent, savedI, this.pos.i) : new OPortAssotiationList(this.parent, savedI, this.pos.i);

    while (this.pos.isValid()) {
      const savedI = this.pos.i;
      // let associationString = this.advancePast(/[,)]/, {returnMatch: true});
      let [associationTokens, lastChar] = this.advanceBraceAwareToken([',', ')']);
      if (associationTokens.length > 0) {
        let actualStart = savedI;
        const association = new OAssociation(list, savedI, savedI + associationTokens.length);
        const index = associationTokens.findIndex(token => token.text === '=>');
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
          const range = new OIRange(list, this.pos.i, this.pos.i + 1);
          range.start.character = 0;

          throw new ParserError(`Unexpected ',' at end of association list`, range);
        }
      } else if (lastChar.text === ')') {
        list.range.end.i = this.pos.i;
        break;
      }
    }
    return list;
  }
}