import { OLexerToken, TokenType } from '../lexer';
import { DeclarativePartParser } from './declarativePartParser';
import { ExpressionParser } from './expressionParser';
import { IHasDeclarations } from './interfaces';
import { OAccessType, OArray, ObjectBase, OEnum, OEnumLiteral, OFileType, OPort, ORecord, ORecordChild, OSubprogram, OSubtypeIndication, OType, OUnit, ParserError } from './objects';
import { ParserBase, ParserState } from './parserBase';
import { SubtypeIndicationParser } from './subtypeIndicationParser';


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
    throw new O.ParserError(`is Units failed in `, this.getToken(0).range);
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
      } else if (this.getToken().getLText() === 'file') {
        Object.setPrototypeOf(type, OFileType.prototype);

        this.expect('file');
        this.expect('of');
        const tokens = this.advanceSemicolon();
        if (tokens.length === 0) {
          this.state.messages.push({
            message: 'Type_mark expected',
            range: type.range
          });
        } else {
          (type as OFileType).subtypeIndication = new OSubtypeIndication(type, tokens.at(0)!.range.copyWithNewEnd(tokens.at(-1)!.range));
          (type as OFileType).subtypeIndication.typeNames = new ExpressionParser(this.state, (type as OFileType).subtypeIndication, tokens).parse();
        }

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
            const subtypeIndication = new SubtypeIndicationParser(this.state, children[0]!).parse();
            this.expect(';');
            for (const child of children) {
              child.subtypeIndication = subtypeIndication;
              child.range = child.range.copyWithNewEnd(subtypeIndication.range);
            }
            (type as ORecord).children.push(...children);
          }
          this.expect('end');
          this.maybe('record');
          (type as ORecord).endingLexerToken = this.maybe(type.lexerToken.text);
          type.range = type.range.copyWithNewEnd(this.state.pos.i);
        } else if (nextToken.getLText() === 'array') {
          Object.setPrototypeOf(type, OArray.prototype);
          (type as OArray).indexNames = [];
          this.expect('(');
          const [tokens] = this.advanceParenthesisAware([')'], false, false);
          const unbounded = tokens.find(token => token.getLText() === '<>');
          if (unbounded) {
            do {
              (type as OArray).indexNames.push(...new ExpressionParser(this.state, type, this.advanceParenthesisAware(['range'], true, true)[0]).parse());
              this.expect('<>');
            } while (this.getToken().getLText() === ',');
            this.expect(')');
          } else {
            (type as OArray).indexNames.push(...new ExpressionParser(this.state, type, this.advanceParenthesisAware([')'], true, true)[0]).parse());

          }
          this.expect('of');
          (type as OArray).subtypeIndication = new SubtypeIndicationParser(this.state, type as OArray).parse();

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
          Object.setPrototypeOf(type, OAccessType.prototype);

          (type as OAccessType).subtypeIndication = new SubtypeIndicationParser(this.state, type as OAccessType).parse();

          const deallocateProcedure = new OSubprogram(this.parent, nextToken.range.copyWithNewEnd(nextToken.range.start));
          deallocateProcedure.lexerToken = new OLexerToken('deallocate', nextToken.range.copyWithNewEnd(nextToken.range.start), TokenType.implicit, deallocateProcedure.rootFile);
          this.parent.declarations.push(deallocateProcedure);
          const port = new OPort(deallocateProcedure, type.lexerToken.range);
          port.subtypeIndication = new OSubtypeIndication(port, port.range);
          port.direction = 'inout';
          port.lexerToken = new OLexerToken('P', type.lexerToken.range, TokenType.implicit, deallocateProcedure.rootFile);
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