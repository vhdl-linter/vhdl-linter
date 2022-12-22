import { OInstantiation, OAssociation, OGenericAssociationList, OIRange, OPortAssociationList, ParserError, OPackage, OPackageInstantiation, OFormalReference, OWrite } from './objects';
import { ParserBase, ParserState } from './parser-base';
import { OLexerToken } from '../lexer';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { ExpressionParser } from './expression-parser';


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
      const savedI = this.state.pos.i;
      // let associationString = this.advancePast(/[,)]/, {returnMatch: true});
      // eslint-disable-next-line prefer-const
      let [associationTokens, lastChar] = this.advanceParenthesisAware([',', ')']);

      if (associationTokens.length > 0) {
        const association = new OAssociation(list, new OIRange(list, savedI, associationTokens[0]?.range?.end?.i ?? savedI));
        {
          const expressionParser = new ExpressionParser(this.state, association, associationTokens);
          const references = expressionParser.parseAssociationElement();
          association.formalPart = references.filter(reference => reference instanceof OFormalReference);
          const actualPart = references.filter(reference => reference instanceof OFormalReference === false);
          association.actualIfInput = actualPart;
        }
        {
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
        {
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