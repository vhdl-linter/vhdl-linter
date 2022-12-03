import { OInstantiation, OAssociation, OGenericAssociationList, OIRange, OPortAssociationList, ParserError, OPackage, OPackageInstantiation } from './objects';
import { ParserBase, ParserState } from './parser-base';
import { OLexerToken } from '../lexer';
import { DiagnosticSeverity } from 'vscode-languageserver';


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
        const index = this.findFormal(associationTokens);
        if (index > -1) {
          const formalTokens = associationTokens.slice(0, index);
          const actualTokens = associationTokens.slice(index + 1);
          association.formalPart = this.parseExpression(association, formalTokens);
          associationTokens = actualTokens;
          if (associationTokens.length === 0) {
            throw new ParserError("The actual part cannot be empty.", association.range.copyWithNewEnd(lastChar.range.end));
          }
        }
        if (associationTokens[0].getLText() !== 'open') {
          association.actualIfInput = this.parseExpression(association, associationTokens);
          if (type === 'port') {
            association.actualIfOutput = this.extractReadsOrWrite(association, associationTokens);
            association.actualIfInoutput = this.extractReadsOrWrite(association, associationTokens, true);
            for (const write of [...association.actualIfInoutput[1], ...association.actualIfOutput[1]]) {
              write.inAssociation = true;
            }
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