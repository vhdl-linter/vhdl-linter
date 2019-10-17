import { ParserBase } from './parser-base';
import { ProcessParser } from './process-parser';
import { InstantiationParser } from './instantiation-parser';
import { ParserPosition } from './parser-position';
import { OSignal, OType, OArchitecture, OEntity, ParserError, OState, OForGenerate, OIfGenerate, OFunction, OFile } from './objects';
import { AssignmentParser } from './assignment-parser';

export class DeclarativePartParser extends ParserBase {
  type: string;
  constructor(text: string, pos: ParserPosition, file: string, private parent: OArchitecture|OEntity) {
    super(text, pos, file);
    this.debug('start');
    this.start = pos.i;
  }
  parse( optional: boolean = false) {
    const signals: OSignal[] = [];
    const types: OType[] = [];
    let nextWord = this.getNextWord({ consume: false }).toLowerCase();
    let multiSignals: string[] = [];
    while (nextWord !== 'begin') {
      if (nextWord === 'signal' || nextWord === 'constant') {
        this.getNextWord();
        const signal = new OSignal(this.parent, this.pos.i, this.getEndOfLineI());

        signal.constant = nextWord === 'constant';
        signal.name = this.getNextWord({withCase: true});
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
          type.states = this.advancePast(')').split(',').map(typyFilterIrgendwas => {
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
        this.advancePast(/\bend\b/i, {allowSemicolon: true});
        let word = this.getNextWord({consume: false});
        while (['case', 'loop', 'if'].indexOf(word.toLowerCase()) > -1) {
          this.advancePast(/\bend\b/i, {allowSemicolon: true});
          word = this.getNextWord({consume: false});
        }
        this.advancePast(';');
        this.parent.functions.push(func);
      } else if (optional && signals.length === 0 && types.length === 0) {
        return { signals, types };
      } else {
        this.getNextWord();
        throw new ParserError(`Unknown Ding: '${nextWord}' on line ${this.getLine()}`, this.pos.i);
      }
      nextWord = this.getNextWord({ consume: false }).toLowerCase();
    }
    return { signals, types };
  }

}
