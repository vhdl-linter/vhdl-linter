import { TextEdit } from 'vscode-languageserver';
import { OI, OInstantiation, OAssociation, OAssociationFormal, OGenericAssociationList as OGenericAssociationList, OIRange, OPortAssociationList as OPortAssotiationList, ParserError, OProcedureCall, OPackage } from "./objects";
import { ParserBase } from "./parser-base";


export class AssociationListParser extends ParserBase {
  constructor(text: string, pos: OI, file: string, private parent: OInstantiation|OProcedureCall|OPackage) {
    super(text, pos, file);
    this.debug(`start`);
  }
  parse(type: 'port' | 'generic' = 'port') {
    const savedI = this.pos.i;
    this.expect('(');

    const list = type === 'generic' ? new OGenericAssociationList(this.parent, savedI, this.pos.i) : new OPortAssotiationList(this.parent, savedI, this.pos.i);

    while (this.pos.i < this.text.length) {
      const savedI = this.pos.i;
      // let associationString = this.advancePast(/[,)]/, {returnMatch: true});
      let [associationString, lastChar] = this.advanceBraceAware([',', ')']);
      let actualStart = savedI;
      const association = new OAssociation(list, savedI, savedI + associationString.length);
      if (associationString.includes('=>')) {
        const [formalString, actualString] = associationString.split('=>');
        association.formalPart = this.extractReads(association, formalString, savedI, true) as OAssociationFormal[];
        for (const namePart of association.formalPart) {
          Object.setPrototypeOf(namePart, OAssociationFormal.prototype);
        }
        associationString = actualString;
        actualStart += formalString.length + 2;
      }
      if (associationString.trim().toLowerCase() !== 'open') {
        association.actualIfInput = this.extractReads(association, associationString, actualStart);
        if (type === 'port') {
          association.actualIfOutput = this.extractReadsOrWrite(association, associationString, actualStart);
        }
      } else {
        association.actualIfInput = [];
        association.actualIfOutput = [[], []];
      }
      list.children.push(association);
      if (lastChar === ',') {
        if (this.text[this.pos.i] === ')') {
          const range = new OIRange(association, this.pos.i, this.pos.i + 1);
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