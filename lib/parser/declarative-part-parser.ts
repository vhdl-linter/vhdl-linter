import { ParserBase } from './parser-base';
import { ParserPosition } from './parser-position';
import { OSignal, OType, OArchitecture, OEntity, ParserError, OState, OFunction, OPackage, OEnum, ORecord } from './objects';

export class DeclarativePartParser extends ParserBase {
  type: string;
  constructor(text: string, pos: ParserPosition, file: string, private parent: OArchitecture|OEntity|OPackage) {
    super(text, pos, file);
    this.debug('start');
  }
  parse( optional: boolean = false, lastWord = 'begin') {
    const signals: OSignal[] = [];
    const types: OType[] = [];
    const functions: OFunction[] = [];
    let nextWord = this.getNextWord({ consume: false }).toLowerCase();
    let multiSignals: string[] = [];
    while (nextWord !== lastWord) {
      if (nextWord === 'signal' || nextWord === 'constant') {
        this.getNextWord();
        const signal = new OSignal(this.parent, this.pos.i, this.getEndOfLineI());

        signal.constant = nextWord === 'constant';
        signal.name = this.getNextWord({});
        if (this.text[this.pos.i] === ',') {
          throw new ParserError(`Defining multiple signals not allowed!: ${this.getLine(this.pos.i)}`, this.pos.i);
          // multiSignals.push(signal.name);
          // this.expect(',');
          // continue;
        }
        this.expect(':');
        const iBeforeType = this.pos.i;
        signal.type = this.getType();
        if (signal.type.indexOf(':=') > -1) {
          const split = signal.type.split(':=');
          signal.type = split[0].trim();
          signal.defaultValue = split[1].trim();

        }
        signal.reads = this.extractReads(signal, signal.type, iBeforeType);
        // console.log(multiSignals, 'multiSignals');
        for (const multiSignalName of multiSignals) {
          const multiSignal = new OSignal(this.parent, -1, -1);
          Object.assign(signal, multiSignal);
          multiSignal.name = multiSignalName;
          signals.push(multiSignal);
        }
        signals.push(signal);
        multiSignals = [];
      } else if (nextWord === 'attribute') {
        this.getNextWord();
        this.advancePast(';');
      } else if (nextWord === 'type') {
        this.getNextWord();
        const type = new OType(this.parent, this.pos.i, this.getEndOfLineI());
        type.name = this.getNextWord();
        this.expect('is');
        if (this.text[this.pos.i] === '(') {
          this.expect('(');
          let position = this.pos.i;
          Object.setPrototypeOf(type, OEnum.prototype);
          (type as OEnum).states = this.advancePast(')').split(',').map(typyFilterIrgendwas => {
            const state = new OState(type, position, this.getEndOfLineI(position));
            const match = typyFilterIrgendwas.match(/^\s*/);
            if (match) {
              state.begin = position + match[0].length;
            } else {
              state.begin = position;
            }
            state.name = typyFilterIrgendwas.trim();
            state.end = state.begin + state.name.length;
            position += typyFilterIrgendwas.length;
            position++;
            return state;
          });
          types.push(type);
          this.expect(';');
        } else {
          const nextWord = this.getNextWord().toLowerCase();
          Object.setPrototypeOf(type, ORecord.prototype);
          (type as ORecord).children = [];
          if (nextWord === 'record') {
            let position = this.pos.i;
            let recordWord = this.getNextWord();
            while (recordWord.toLowerCase() !== 'end') {
              const child = new OType(type, position, position + recordWord.length);
              child.name = recordWord;
              (type as ORecord).children.push(child);
              this.advanceSemicolon();
              position = this.pos.i;
              recordWord = this.getNextWord();
            }
            this.maybeWord('record');
            this.maybeWord(type.name);
          }
          types.push(type);
          this.advancePast(';');
        }
      } else if (nextWord === 'component') {
        this.getNextWord();
        const componentName = this.getNextWord();
        this.advancePast(/\bend\b/i, {allowSemicolon: true});
        this.maybeWord('component');
        this.maybeWord(componentName);
        this.expect(';');
      } else if (nextWord === 'function') {
        this.getNextWord();
        const func = new OFunction(this.parent, this.pos.i, this.getEndOfLineI());
        func.name = this.getNextWord();
        if (!(this.parent instanceof OPackage)) {
          this.advancePast(/\bend\b/i, {allowSemicolon: true});
          let word = this.getNextWord({consume: false});
          while (['case', 'loop', 'if'].indexOf(word.toLowerCase()) > -1) {
            this.advancePast(/\bend\b/i, {allowSemicolon: true});
            word = this.getNextWord({consume: false});
          }
        }
        this.advancePast(';');
        functions.push(func);
      } else if (optional && signals.length === 0 && types.length === 0) {
        return { signals, types, functions };
      } else {
        this.getNextWord();
        throw new ParserError(`Unknown Ding: '${nextWord}' on line ${this.getLine()}`, this.pos.i);
      }
      nextWord = this.getNextWord({ consume: false }).toLowerCase();
    }
    return { signals, types, functions };
  }

}
