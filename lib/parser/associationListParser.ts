import { DiagnosticSeverity, TextEdit } from 'vscode-languageserver';
import { ExpressionParser } from './expressionParser';
import * as O from './objects';
import { ParserBase, ParserState } from './parserBase';


export class AssociationListParser extends ParserBase {
  constructor(state: ParserState, private parent: O.OInstantiation | O.OPackageInstantiation | O.OInterfacePackage) {
    super(state);
    this.debug(`start`);
  }

  parsePortAssociations() {
    return this.parse('port') as O.OPortAssociationList;
  }
  parseGenericAssociations() {
    return this.parse('generic') as O.OGenericAssociationList;
  }

  private parse(type: 'port' | 'generic') {
    const braceToken = this.expect('(');
    if (type === 'port' && (this.parent instanceof O.OPackageInstantiation || this.parent instanceof O.OInterfacePackage)) {
      throw new O.ParserError('port association list is not allowed for package instantiations.', this.getToken().range);
    }
    const list = type === 'generic' ? new O.OGenericAssociationList(this.parent, braceToken.range) : new O.OPortAssociationList(this.parent as O.OInstantiation, braceToken.range);

    while (this.state.pos.isValid()) {
      // let associationString = this.advancePast(/[,)]/, {returnMatch: true});
      const [associationTokens, lastChar] = this.advanceParenthesisAware([',', ')']);
      if (associationTokens.length > 0) {
        const combinedRange = associationTokens[0]!.range.copyWithNewEnd(associationTokens[associationTokens.length - 1]!.range);
        const association = new O.OAssociation(list, combinedRange);
        // At this point we do not know the direction of the port.
        // We for now parse all the possibilities and then handle the differences during elaboration
        { // Parse assuming association is input
          const expressionParser = new ExpressionParser(this.state, association, associationTokens);
          const references = expressionParser.parseAssociationElement();
          association.formalPart = references.filter(reference => reference instanceof O.OFormalName);
          const actualPart = references.filter(reference => reference instanceof O.OFormalName === false);
          association.actualIfInput = actualPart;
        }
        if (type === 'port') { // Parse assuming association is output
          const expressionParser = new ExpressionParser(this.state, association, associationTokens);
          const references = expressionParser.parseAssociationElement(true);
          association.formalPart = references.filter(reference => reference instanceof O.OFormalName);
          const actualPart = references.filter(reference => reference instanceof O.OFormalName === false);
          association.actualIfOutput = actualPart;
        }
        if (type === 'port') { // Parse assuming association is inout
          const expressionParser = new ExpressionParser(this.state, association, associationTokens);
          const references = expressionParser.parseAssociationElement(false, true);
          association.formalPart = references.filter(reference => reference instanceof O.OFormalName);
          const actualPart = references.filter(reference => reference instanceof O.OFormalName === false);

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