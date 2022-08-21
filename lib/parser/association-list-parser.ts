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
      let [associationString, lastChar] = this.advanceBraceAware([',', ')']);
      if (associationString.length > 0) {
        let actualStart = savedI;
        const association = new OAssociation(list, savedI, savedI + associationString.length);
        if (associationString.includes('=>')) {
          const [formalString, actualString] = associationString.split(/=>(.*)/s); // match also assotiations like "a_i => (others => s_a)" (https://stackoverflow.com/a/4607799)
          association.formalPart = this.extractReads(association, formalString, savedI, true);
          associationString = actualString;
          actualStart += formalString.length + 2;
        }
        if (associationString.trim().toLowerCase() !== 'open') {
          association.actualIfInput = this.extractReads(association, associationString, actualStart);
          if (type === 'port') {
            association.actualIfOutput = this.extractReadsOrWrite(association, associationString, actualStart);
            association.actualIfInoutput = this.extractReadsOrWrite(association, associationString, actualStart, true);
          }
        } else {
          association.actualIfInput = [];
          association.actualIfOutput = [[], []];
          association.actualIfInoutput = [[], []];
        }
        list.children.push(association);
      }
      if (lastChar === ',') {
        if (this.getToken().getLText() === ')') {
          const range = new OIRange(list, this.pos.i, this.pos.i + 1);
          range.start.character = 0;

          throw new ParserError(`Unexpected ',' at end of association list`, range);
        }
      } else if (lastChar === ')') {
        list.range.end.i = this.pos.i;
        break;
      }
    }
    return list;
  }
}