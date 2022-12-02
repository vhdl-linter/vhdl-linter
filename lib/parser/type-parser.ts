import { OLexerToken } from '../lexer';
import { DeclarativePartParser } from './declarative-part-parser';
import { OArchitecture, OEntity, OEnum, OEnumLiteral, OIRange, OPackage, OPackageBody, OPort, OProcess, ORecord, ORecordChild, OSubprogram, OType, ParserError } from './objects';
import { ParserBase, ParserState } from './parser-base';


export class TypeParser extends ParserBase {
  constructor(state: ParserState, private parent: OArchitecture | OEntity | OPackage | OPackageBody | OProcess | OSubprogram | OType) {
    super(state);
    this.debug('start');
  }
  // Can this be generalizes somehow?
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
    throw new ParserError(`is Units failes in `, this.getToken(0).range);
  }
  parse(): OType {
    const type = new OType(this.parent, this.getToken().range.copyExtendEndOfLine());
    this.consumeToken();
    type.lexerToken = this.consumeToken();
    if (this.getToken().getLText() === ';') {
      type.incomplete = true;
      this.advancePast(';');
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
        this.advancePast('units');
        type.units = [];
        type.units.push(this.consumeToken().getLText());
        this.advanceSemicolon();
        while (this.getToken().getLText() !== 'end' || this.getToken(1, true).getLText() !== 'units') {
          type.units.push(this.consumeToken().getLText());
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
              child.reads = this.extractReads(child, typeTokens);
              child.range = child.range.copyWithNewEnd(this.state.pos.i);
            }
            (type as ORecord).children.push(...children);
          }
          this.maybe('record');
          this.maybe(type.lexerToken.text);
        } else if (nextToken.getLText() === 'array') {
          const [token] = this.advanceParentheseAware([';'], true, false);
          type.reads.push(...this.extractReads(type, token));
        } else if (nextToken.getLText() === 'protected') {
          const protectedBody = this.maybe('body');
          if (protectedBody) {
            type.protectedBody = true;
          } else {
            type.protected = true;
          }
          new DeclarativePartParser(this.state, type).parse(false, 'end');
          this.expect('end');
          this.expect('protected');
          this.maybe(type.lexerToken.text);
        } else if (nextToken.getLText() === 'range') {
          // TODO
        } else if (nextToken.getLText() === 'access') {
          // Is this a hack, or is it just fantasy/vhdl
          const [typeTokens] = this.advanceParentheseAware([';'], true, false);
          const deallocateProcedure = new OSubprogram(this.parent, new OIRange(this.parent, typeTokens[0].range.start.i, typeTokens[typeTokens.length - 1].range.end.i));
          deallocateProcedure.lexerToken = new OLexerToken('deallocate', type.lexerToken.range, type.lexerToken.type);
          this.parent.subprograms.push(deallocateProcedure);
          const port = new OPort(deallocateProcedure, type.lexerToken.range);
          port.direction = 'inout';
          deallocateProcedure.ports = [port];
        }
        type.range = type.range.copyWithNewEnd(this.state.pos.i);
        this.advancePast(';');
      }
    } else {
      type.range = type.range.copyWithNewEnd(this.state.pos.i);
      this.advancePast(';');
    }
    return type;
  }
}