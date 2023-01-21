import { DiagnosticSeverity } from 'vscode-languageserver';
import { OLexerToken } from '../lexer';
import { ExpressionParser } from './expression-parser';
import { OAssociation, OFormalReference, OGenericAssociationList, OInstantiation, OPackage, OPackageInstantiation, OPortAssociationList, OWrite } from './objects';
import { ParserBase, ParserState } from './parser-base';


export class AssociationListParser extends ParserBase {
  constructor(state: ParserState, private parent: OInstantiation | OPackage | OPackageInstantiation) {
    super(state);
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
    const braceToken = this.expect('(');

    const list = type === 'generic' ? new OGenericAssociationList(this.parent, braceToken.range) : new OPortAssociationList(this.parent, braceToken.range);

    while (this.state.pos.isValid()) {
      // let associationString = this.advancePast(/[,)]/, {returnMatch: true});
      // eslint-disable-next-line prefer-const
      let [associationTokens, lastChar] = this.advanceParenthesisAware([',', ')']);
      if (associationTokens.length > 0) {
        const combinedRange = associationTokens[0].range.copyWithNewEnd(associationTokens[associationTokens.length - 1].range);
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
          const references = expressionParser.parseAssociationElement();
          association.formalPart = references.filter(reference => reference instanceof OFormalReference);
          const actualPart = references.filter(reference => reference instanceof OFormalReference === false);
          const writes = actualPart.slice(0, 1).map(a => {
            Object.setPrototypeOf(a, OWrite.prototype);
            (a as OWrite).type = 'OWrite';
            (a as OWrite).inAssociation = true;
            return a as OWrite;
          });
          association.actualIfOutput = [actualPart.slice(1), writes];
        }
        if (type === 'port') { // Parse assuming association is inout
          const expressionParser = new ExpressionParser(this.state, association, associationTokens);
          const references = expressionParser.parseAssociationElement();
          association.formalPart = references.filter(reference => reference instanceof OFormalReference);
          const actualPart = references.filter(reference => reference instanceof OFormalReference === false);
          const writes = actualPart.slice(0, 1).map(a => {
            const write = new OWrite(a.parent, a.referenceToken);
            write.inAssociation = true;

            return write;
          });
          association.actualIfInoutput = [actualPart, writes];
        }


        list.children.push(association);
      }
      if (lastChar.text === ',') {
        if (this.getToken().getLText() === ')') {
          this.state.messages.push({
            message: `Unexpected ',' at end of association list`,
            range: this.getToken().range.copyExtendBeginningOfLine(),
            severity: DiagnosticSeverity.Error
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