import { DiagnosticSeverity } from 'vscode-languageserver-types';
import { OLexerToken } from '../lexer';
import { DeclarativePartParser } from './declarativePartParser';
import { ExpressionParser } from './expressionParser';
import { IHasDeclarations } from './interfaces';
import { OArray, ObjectBase, OEnum, OEnumLiteral, OIRange, OPort, ORecord, ORecordChild, OSubprogram, OType, OUnit, ParserError } from './objects';
import { ParserBase, ParserState } from './parserBase';


export class TypeParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase & IHasDeclarations) {
    super(state);
    this.debug('start');
  }
  // Can this be generalized somehow?
  isUnits(): boolean {
    let i = 0;
    while (this.state.pos.num + i < this.state.pos.lexerTokens.length) {
      if (this.getToken(i).getLText() === ';') {
        return false;
      } else if (this.getToken(i).getLText() === 'units') {
        return true;
      }
      i++;
    }
    throw new ParserError(`is Units failed in `, this.getToken(0).range);
  }
  parse(): OType {
    const type = new OType(this.parent, this.getToken().range.copyExtendEndOfLine());
    this.consumeToken();
    type.lexerToken = this.consumeToken();
    if (this.getToken().getLText() === ';') {
      type.incomplete = true;
      this.consumeToken();
      return type;
    }
    const nextToken = this.consumeToken();
    if (nextToken.getLText() === 'is') {
      if (this.getToken().text === '(') {
        this.expect('(');
        Object.setPrototypeOf(type, OEnum.prototype);
        const enumItems: OLexerToken[] = [];
        while (this.state.pos.isValid()) {
          if (this.getToken().getLText() === '\'') {
            this.consumeToken();
          }
          if (this.getToken().getLText() === ',') {
            enumItems.push(this.getToken(-1, true));
          }
          if (this.getToken().getLText() === ')') {
            enumItems.push(this.getToken(-1, true));
            this.consumeToken();
            break;
          }
          this.consumeToken();
        }

        (type as OEnum).literals = enumItems.map(item => {
          const enumLiteral = new OEnumLiteral(type, item.range);
          enumLiteral.lexerToken = item;
          return enumLiteral;
        });
        type.range = type.range.copyWithNewEnd(this.state.pos.i);
        this.advanceWhitespace();
        this.expect(';');
      } else if (this.isUnits()) {
        this.advanceParenthesisAware(['units']);
        type.units = [];
        type.units.push(new OUnit(type, this.consumeToken()));
        this.advanceSemicolon();
        while (this.getToken().getLText() !== 'end' || this.getToken(1, true).getLText() !== 'units') {
          type.units.push(new OUnit(type, this.consumeToken()));
          this.advanceSemicolon();
        }
        this.expect('end');
        this.expect('units');
        type.range = type.range.copyWithNewEnd(this.state.pos.i);
        this.expect(';');
      } else {
        const nextToken = this.consumeToken();
        if (nextToken.getLText() === 'record') {
          Object.setPrototypeOf(type, ORecord.prototype);
          (type as ORecord).children = [];
          while (this.getToken().getLText() !== 'end') {
            const children: ORecordChild[] = [];
            do {
              this.maybe(',');
              const lexerToken = this.consumeToken();
              const child = new ORecordChild(type, lexerToken.range);
              child.lexerToken = lexerToken;
              children.push(child);
            } while (this.getToken().getLText() === ',');
            this.expect(':');
            const typeTokens = this.advanceSemicolon();
            for (const child of children) {
              if (typeTokens.length > 0) {
                child.typeNames = new ExpressionParser(this.state, child, typeTokens).parse();
                child.range = child.range.copyWithNewEnd(typeTokens[typeTokens.length - 1]!.range);
              } else {
                this.state.messages.push({
                  message: 'Found no type indication of this record child.',
                  range: child.range,
                  severity: DiagnosticSeverity.Error
                });
              }
            }
            (type as ORecord).children.push(...children);
          }
          this.expect('end');
          this.maybe('record');
          (type as ORecord).endingLexerToken = this.maybe(type.lexerToken.text);
          type.range = type.range.copyWithNewEnd(this.state.pos.i);
        } else if (nextToken.getLText() === 'array') {
          Object.setPrototypeOf(type, OArray.prototype);
          this.expect('(');
          const [tokens] = this.advanceParenthesisAware([')'], false, false);
          const unbounded = tokens.find(token => token.getLText() === '<>');
          if (unbounded) {
            do {
              type.nameLinks.push(...new ExpressionParser(this.state, type, this.advanceParenthesisAware(['range'], true, true)[0]).parse());
              this.expect('<>');
            } while (this.getToken().getLText() === ',');
            this.expect(')');
          } else {
            type.nameLinks.push(...new ExpressionParser(this.state, type, this.advanceParenthesisAware([')'], true, true)[0]).parse());

          }
          this.expect('of');
          (type as OArray).elementType = new ExpressionParser(this.state, type, this.advanceParenthesisAware([';'], true, false)[0]).parse();

        } else if (nextToken.getLText() === 'protected') {
          const protectedBody = this.maybe('body');
          if (protectedBody) {
            type.protectedBody = true;
          } else {
            type.protected = true;
          }
          new DeclarativePartParser(this.state, type).parse(false, 'end');
          this.expect('protected');
          this.maybe(type.lexerToken.text);
        } else if (nextToken.getLText() === 'range') {
          // TODO
        } else if (nextToken.getLText() === 'access') {
          const [typeTokens] = this.advanceParenthesisAware([';'], true, false);
          const firstTypeToken = typeTokens[0];
          const lastTypeToken = typeTokens[typeTokens.length - 1];
          if (!firstTypeToken || !lastTypeToken) {
            throw new ParserError("Invalid access type", nextToken.range.copyExtendEndOfLine());
          }
          type.access = true;
          type.subtypeIndication = new ExpressionParser(this.state, this.parent, typeTokens).parse();
          const deallocateProcedure = new OSubprogram(this.parent, new OIRange(this.parent, firstTypeToken.range.start.i, lastTypeToken.range.end.i));
          deallocateProcedure.lexerToken = new OLexerToken('deallocate', type.lexerToken.range, type.lexerToken.type, deallocateProcedure.rootFile);
          this.parent.declarations.push(deallocateProcedure);
          const port = new OPort(deallocateProcedure, type.lexerToken.range);
          port.direction = 'inout';
          deallocateProcedure.ports = [port];
        }
        type.range = type.range.copyWithNewEnd(this.state.pos.i);
        this.advanceSemicolon();
      }
    } else {
      type.range = type.range.copyWithNewEnd(this.state.pos.i);
      this.advanceSemicolon();
    }
    return type;
  }
}