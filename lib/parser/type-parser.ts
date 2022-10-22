import { OLexerToken } from '../lexer';
import { DeclarativePartParser } from './declarative-part-parser';
import { OArchitecture, OEntity, OEnum, OEnumLiteral, OIRange, OPackage, OPackageBody, OPort, OProcess, ORecord, ORecordChild, OSubprogram, OType, ParserError } from './objects';
import { ParserPosition } from './parser';
import { ParserBase } from './parser-base';


export class TypeParser extends ParserBase {

  constructor(pos: ParserPosition, file: string, private parent: OArchitecture | OEntity | OPackage | OPackageBody | OProcess | OSubprogram | OType) {
    super(pos, file);
    this.debug('start');
  }
  // Can this be generalizes somehow?
  isUnits(): boolean {
    let i = 0;
    while (this.pos.num + i < this.pos.lexerTokens.length) {
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
      this.advancePastToken(';');
      return type;
    }
    const nextToken = this.consumeToken();
    if (nextToken.getLText() === 'is') {
      if (this.getToken().text === '(') {
        this.expect('(');
        Object.setPrototypeOf(type, OEnum.prototype);
        const enumItems: OLexerToken[] = [];
        while (this.pos.isValid()) {
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
        type.range = type.range.copyWithNewEnd(this.pos.i);
        this.advanceWhitespace();
        this.expect(';');
      } else if (this.isUnits()) {
        this.advancePastToken('units');
        type.units = [];
        type.units.push(this.consumeToken().getLText());
        this.advanceSemicolonToken();
        while (this.getToken().getLText() !== 'end' || this.getToken(1, true).getLText() !== 'units') {
          type.units.push(this.consumeToken().getLText());
          this.advanceSemicolonToken();
        }
        this.expect('end');
        this.expect('units');
        type.range = type.range.copyWithNewEnd(this.pos.i);
        this.expect(';');
      } else {
        const nextToken = this.consumeToken();
        if (nextToken.getLText() === 'record') {
          Object.setPrototypeOf(type, ORecord.prototype);
          (type as ORecord).children = [];
          while (this.getToken().getLText() !== 'end') {
            const children: ORecordChild[] = [];
            do {
              this.maybeWord(',');
              const lexerToken = this.consumeToken();
              const child = new ORecordChild(type, lexerToken.range);
              child.lexerToken = lexerToken;
              children.push(child);
            } while (this.getToken().getLText() === ',');
            this.expect(':');
            const typeTokens = this.advanceSemicolonToken();
            for (const child of children) {
              child.reads = this.extractReads(child, typeTokens);
            }
            (type as ORecord).children.push(...children);
          }
          this.maybeWord('record');
          this.maybeWord(type.lexerToken.text);
        } else if (nextToken.getLText() === 'array') {
          const [token] = this.advanceBraceAwareToken([';'], true, false);
          type.reads.push(...this.extractReads(type, token));
        } else if (nextToken.getLText() === 'protected') {
          this.maybeWord('body');
          new DeclarativePartParser(this.pos, this.filePath, type).parse(false, 'end');
          this.expect('end');
          this.expect('protected');
          this.maybeWord(type.lexerToken.text);
        } else if (nextToken.getLText() === 'range') {
          // TODO
        } else if (nextToken.getLText() === 'access') {
          // Is this a hack, or is it just fantasy/vhdl
          const [typeTokens] = this.advanceBraceAwareToken([';'], true, false);
          const deallocateProcedure = new OSubprogram(this.parent, new OIRange(this.parent, typeTokens[0].range.start.i, typeTokens[typeTokens.length - 1].range.end.i));
          deallocateProcedure.lexerToken = new OLexerToken('deallocate', type.lexerToken.range, type.lexerToken.type);
          this.parent.subprograms.push(deallocateProcedure);
          const port = new OPort(deallocateProcedure, type.lexerToken.range);
          port.direction = 'inout';
          deallocateProcedure.ports = [port];
        }
        type.range = type.range.copyWithNewEnd(this.pos.i);
        this.advancePastToken(';');
      }
    } else {
      type.range = type.range.copyWithNewEnd(this.pos.i);
      this.advancePastToken(';');
    }
    return type;
  }
}