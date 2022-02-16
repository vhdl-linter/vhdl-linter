import { DeclarativePartParser } from "./declarative-part-parser";
import { OArchitecture, OEntity, OEnum, OI, OName, OPackage, OPackageBody, OProcess, ORecord, ORecordChild, OState, OSubprogram, OType, ParserError } from "./objects";
import { ParserBase } from "./parser-base";


export class TypeParser extends ParserBase {

  constructor(text: string, pos: OI, file: string, private parent: OArchitecture | OEntity | OPackage | OPackageBody | OProcess | OSubprogram | OType) {
    super(text, pos, file);
    this.debug('start');
  }

  parse(): OType {
    const type = new OType(this.parent, this.pos.i, this.getEndOfLineI());
    this.getNextWord();
    const startTypeName = this.pos.i;
    const typeName = this.getNextWord();
    type.name = new OName(type, startTypeName, startTypeName + typeName.length);
    type.name.text = typeName;

    if (this.getNextWord().toLowerCase() === 'is') {
      if (this.text[this.pos.i] === '(') {
        this.expect('(');
        Object.setPrototypeOf(type, OEnum.prototype);
        const enumItems: {text: string, start: number, end: number}[] = [];
        let quotes = false;
        let i = this.pos.i;
        let lastI = i;
        while (this.text[i]) {
          if (this.text[i] === '"' && this.text[i+1] !== '"') {
            quotes = !quotes;
          }
          if (!quotes && this.text[i] === "'") {
            i += 2;
          }
          if (!quotes && this.text[i] === ',') {
            enumItems.push({text: this.text.substring(lastI, i).trim(), start: lastI, end: i - 1});
            lastI = i + 1;
          }
          if (!quotes && this.text[i] === ')') {
            enumItems.push({text: this.text.substring(lastI, i).trim(), start: lastI, end: i +-1});
            this.pos.i = i + 1;
            break;
          }
          i++;
        }

        (type as OEnum).states = enumItems.map(item => {
          const state = new OState(type, item.start, item.end);
          state.name = new OName(state, item.start, item.start + item.text.length);
          state.name.text = item.text;
          state.range.end.i = state.range.start.i + state.name.text.length;
          return state;
        });
        type.range.end.i = this.pos.i;
        this.parent.types.push(type);
        this.advanceWhitespace();
        this.expect(';');
      } else if (this.test(/^[^;]*units/i)) {
        this.advancePast('units');
        type.units = [];
        type.units.push(this.getNextWord());
        this.advanceSemicolon();
        while (!this.test(/^end\s+units/i)) {
          type.units.push(this.getNextWord());
          this.advanceSemicolon();
        }
        this.expect('end');
        this.expect('units');
        type.range.end.i = this.pos.i;
        this.parent.types.push(type);
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
          const match = /;/.exec(this.text.substr(this.pos.i));
          if (!match) {
            throw new ParserError(`could not find semicolon`, this.pos.getRangeToEndLine());
          }
          const text = this.text.substr(this.pos.i, match.index);
          this.pos.i += match.index;
          type.reads.push(...this.extractReads(type, text, startI));
        } else if (nextWord === 'protected') {
          this.maybeWord('body');
          new DeclarativePartParser(this.text, this.pos, this.file, type).parse(false, 'end');
          this.expect('end');
          this.expect('protected');
          this.maybeWord(type.name.text);
        } else if (nextWord === 'range') {
          // TODO
        } else if (nextWord === 'access') {
          // TODO
        }
        type.range.end.i = this.pos.i;
        this.parent.types.push(type);
        this.advancePast(';');
      }
    } else {
      type.range.end.i = this.pos.i;
      this.parent.types.push(type);
      this.advancePast(';');
    }
    return type;
  }
}