import { DiagnosticSeverity, TextEdit } from 'vscode-languageserver';
import { ExpressionParser } from './expression-parser';
import { OAssociation, OFormalReference, OGenericAssociationList, OInstantiation, OPackage, OPackageInstantiation, OPortAssociationList } from './objects';
import { ParserBase, ParserState } from './parser-base';


export class AssociationListParser extends ParserBase {
  constructor(state: ParserState, private parent: OInstantiation | OPackage | OPackageInstantiation) {
    super(state);
    this.debug(`start`);
  }

  parse(type: 'port' | 'generic' = 'port') {
    const braceToken = this.expect('(');

    const list = type === 'generic' ? new OGenericAssociationList(this.parent, braceToken.range) : new OPortAssociationList(this.parent, braceToken.range);

    while (this.state.pos.isValid()) {
      // let associationString = this.advancePast(/[,)]/, {returnMatch: true});
      // eslint-disable-next-line prefer-const
      let [associationTokens, lastChar] = this.advanceParenthesisAware([',', ')']);
      if (associationTokens.length > 0) {
        const combinedRange = associationTokens[0]!.range.copyWithNewEnd(associationTokens[associationTokens.length - 1]!.range);
        const association = new OAssociation(list, combinedRange);
        // At this point we do not know the direction of the port.
        // We for now parse all the possibilities and then handle the differences during elaboration
        { // Parse assuming association is input
          const expressionParser = new ExpressionParser(this.state, association, associationTokens);
          const references = expressionParser.parseAssociationElement();
          association.formalPart = references.filter(reference => reference instanceof OFormalReference);
          const actualPart = references.filter(reference => reference instanceof OFormalReference === false);
          association.actualIfInput = actualPart;
        }
        if (type === 'port') { // Parse assuming association is output
          const expressionParser = new ExpressionParser(this.state, association, associationTokens);
          const references = expressionParser.parseAssociationElement(true);
          association.formalPart = references.filter(reference => reference instanceof OFormalReference);
          const actualPart = references.filter(reference => reference instanceof OFormalReference === false);
          association.actualIfOutput = actualPart;
        }
        if (type === 'port') { // Parse assuming association is inout
          const expressionParser = new ExpressionParser(this.state, association, associationTokens);
          const references = expressionParser.parseAssociationElement(false, true);
          association.formalPart = references.filter(reference => reference instanceof OFormalReference);
          const actualPart = references.filter(reference => reference instanceof OFormalReference === false);

          association.actualIfInoutput = actualPart;
        }


        list.children.push(association);
      }
      if (lastChar.text === ',') {
        if (this.getToken().getLText() === ')') {
          this.state.messages.push({
            message: `Unexpected ',' at end of association list`,
            range: lastChar.range,
            severity: DiagnosticSeverity.Error,
            solution: {
              message: `Remove ','`,
              edits: [TextEdit.del(lastChar.range)]
            }
          });
        }
      } else if (lastChar.text === ')') {
        list.range = list.range.copyWithNewEnd(this.state.pos.i);
        break;
      }
    }
    return list;
  }
}