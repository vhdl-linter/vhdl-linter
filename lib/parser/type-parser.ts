import { DeclarativePartParser } from './declarative-part-parser';
import { OArchitecture, OEntity, OEnum, OI, OName, OPackage, OPackageBody, OProcess, ORecord, ORecordChild, OEnumLiteral, OSubprogram, OType, ParserError, OPort, OIRange } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';
import { OLexerToken } from '../lexer';


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
    this.getNextWord();
    const startTypeName = this.pos.i;
    const typeName = this.consumeToken();
    type.name = new OName(type, typeName.range);
    type.name.text = typeName.text;
    if (this.getToken().getLText() === ';') {
      this.advancePast(';');
      return type;
    }
    if (this.getNextWord().toLowerCase() === 'is') {
      if (this.getToken().text === '(') {
        this.expect('(');
        Object.setPrototypeOf(type, OEnum.prototype);
        const enumItems: OLexerToken[] = [];
        let i = this.pos.i;
        let lastI = i;
        while (this.pos.isValid()) {
          if (this.getToken().getLText() === '\'') {
            this.consumeToken();
          }
          if (this.getToken().getLText() === ',') {
            enumItems.push(this.getToken(-1, true));
            lastI = i + 1;
          }
          if (this.getToken().getLText() === ')') {
            enumItems.push(this.getToken(-1, true));
            this.consumeToken();
            break;
          }
          this.consumeToken();
        }

        (type as OEnum).literals = enumItems.map(item => {
          const state = new OEnumLiteral(type, item.range);
          state.name = new OName(state, item.range);
          state.name.text = item.text;
          return state;
        });
        type.range.end.i = this.pos.i;
        this.advanceWhitespace();
        this.expect(';');
      } else if (this.isUnits()) {
        this.advancePast('units');
        type.units = [];
        type.units.push(this.getNextWord());
        this.advanceSemicolonToken();
        while (this.getToken().getLText() !== 'end' || this.getToken(1, true).getLText() !== 'units') {
          type.units.push(this.getNextWord());
          this.advanceSemicolonToken();
        }
        this.expect('end');
        this.expect('units');
        type.range.end.i = this.pos.i;
        this.expect(';');
      } else {
        const nextWord = this.getNextWord().toLowerCase();
        if (nextWord === 'record') {
          Object.setPrototypeOf(type, ORecord.prototype);
          (type as ORecord).children = [];
          let position = this.pos.i;
          let recordToken = this.consumeToken();
          while (recordToken.getLText() !== 'end') {
            const child = new ORecordChild(type, recordToken.range);
            child.name = new OName(child, recordToken.range);
            child.name.text = recordToken.text;
            (type as ORecord).children.push(child);
            this.advanceSemicolonToken();
            child.range.end.i = this.pos.i;
            position = this.pos.i;
            recordToken = this.consumeToken();
          }
          this.maybeWord('record');
          this.maybeWord(type.name.text);
        } else if (nextWord === 'array') {
          const startI = this.pos.i;
          const [token] = this.advanceBraceAwareToken([';'], true, false);
          type.reads.push(...this.extractReads(type, token));
        } else if (nextWord === 'protected') {
          this.maybeWord('body');
          new DeclarativePartParser(this.pos, this.filePath, type).parse(false, 'end');
          this.expect('end');
          this.expect('protected');
          this.maybeWord(type.name.text);
        } else if (nextWord === 'range') {
          // TODO
        } else if (nextWord === 'access') {
          // Is this a hack, or is it just fantasy/vhdl
          const [typeTokens] = this.advanceBraceAwareToken([';'], true, false);
          const deallocateProcedure = new OSubprogram(this.parent, new OIRange(this.parent, typeTokens[0].range.start.i, typeTokens[typeTokens.length - 1].range.end.i));
          deallocateProcedure.name = new OName(deallocateProcedure, type.name.range);
          deallocateProcedure.name.text = 'deallocate';
          this.parent.subprograms.push(deallocateProcedure);
          const port = new OPort(deallocateProcedure, type.name.range);
          port.direction = 'inout';
          deallocateProcedure.ports = [port];
        }
        type.range.end.i = this.pos.i;
        this.advancePast(';');
      }
    } else {
      type.range.end.i = this.pos.i;
      this.advancePast(';');
    }
    return type;
  }
}