import { DeclarativePartParser } from './declarative-part-parser';
import { OArchitecture, OEntity, OEnum, OI, OName, OPackage, OPackageBody, OProcess, ORecord, ORecordChild, OEnumLiteral, OSubprogram, OType, ParserError } from './objects';
import { ParserBase } from './parser-base';
import { ParserPosition } from './parser';


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
    const type = new OType(this.parent, this.pos.i, this.getEndOfLineI());
    this.getNextWord();
    const startTypeName = this.pos.i;
    const typeName = this.getNextWord();
    type.name = new OName(type, startTypeName, startTypeName + typeName.length);
    type.name.text = typeName;
    if (this.getToken().getLText() === ';') {
      this.advancePast(';');
      return type;
    }
    if (this.getNextWord().toLowerCase() === 'is') {
      if (this.getToken().text === '(') {
        this.expect('(');
        Object.setPrototypeOf(type, OEnum.prototype);
        const enumItems: {text: string, start: number, end: number}[] = [];
        let i = this.pos.i;
        let lastI = i;
        while (this.pos.isValid()) {
          if (this.getToken().getLText() === '\'') {
            this.consumeToken();
          }
          if (this.getToken().getLText() === ',') {
            enumItems.push({text: this.getToken(-1).text, start: lastI, end: i - 1});
            lastI = i + 1;
          }
          if (this.getToken().getLText() === ')') {
            enumItems.push({ text: this.getToken(-1).text, start: lastI, end: i + -1});
            this.consumeToken();
            break;
          }
          this.consumeToken();
        }

        (type as OEnum).literals = enumItems.map(item => {
          const state = new OEnumLiteral(type, item.start, item.end);
          state.name = new OName(state, item.start, item.start + item.text.length);
          state.name.text = item.text;
          state.range.end.i = state.range.start.i + state.name.text.length;
          return state;
        });
        type.range.end.i = this.pos.i;
        this.advanceWhitespace();
        this.expect(';');
      } else if (this.isUnits()) {
        this.advancePast('units');
        type.units = [];
        type.units.push(this.getNextWord());
        this.advanceSemicolon();
        while (this.getToken().getLText() !== 'end' || this.getToken(1, true).getLText() !== 'units') {
          type.units.push(this.getNextWord());
          this.advanceSemicolon();
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
          let recordWord = this.getNextWord();
          while (recordWord.toLowerCase() !== 'end') {
            const child = new ORecordChild(type, position, position);
            child.name = new OName(child, position, position + recordWord.length);
            child.name.text = recordWord;
            (type as ORecord).children.push(child);
            this.advanceSemicolon();
            child.range.end.i = this.pos.i;
            position = this.pos.i;
            recordWord = this.getNextWord();
          }
          this.maybeWord('record');
          this.maybeWord(type.name.text);
        } else if (nextWord === 'array') {
          const startI = this.pos.i;
          const [text] = this.advanceBraceAware([';'], true, false);
          type.reads.push(...this.extractReads(type, text, startI));
        } else if (nextWord === 'protected') {
          this.maybeWord('body');
          new DeclarativePartParser(this.pos, this.filePath, type).parse(false, 'end');
          this.expect('end');
          this.expect('protected');
          this.maybeWord(type.name.text);
        } else if (nextWord === 'range') {
          // TODO
        } else if (nextWord === 'access') {
          // TODO
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