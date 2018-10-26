import { ParserBase } from './parser-base';
import { ProcessParser } from './process-parser';
import { InstantiationParser } from './instantiation-parser';
import { ParserPosition } from './parser-position';
import { OSignal, OType, OArchitecture, ParserError, OState, OForGenerate, OIfGenerate } from './objects';
import { AssignmentParser } from './assignment-parser';

export class ArchitectureParser extends ParserBase {
  name: string;
  type: string;
  constructor(text: string, pos: ParserPosition, file: string, private parent: object, name?: string) {
    super(text, pos, file);
    this.debug('start');
    this.start = pos.i;
    if (name) {
      this.name = name;
    }
  }
  parse(skipStart = false, structureName = 'architecture'): OArchitecture {
    let architecture = new OArchitecture(this.parent, this.pos.i);
    if (skipStart !== true) {
      this.type = this.getNextWord();
      this.expect('of');
      this.name = this.getNextWord();
      this.expect('is');
    }

    const { signals, types } = this.parseDefinitionBlock(architecture, structureName !== 'architecture');
    architecture.signals = signals;
    architecture.types = types;

    while (this.pos.i < this.text.length) {
      if (this.text[this.pos.i].match(/\s/)) {
        this.pos.i++;
        continue;
      }
      let nextWord = this.getNextWord().toLowerCase();
      console.log(nextWord, 'nextWord');
      if (nextWord === 'end') {
        this.maybeWord(structureName);
        if (this.type) {
          this.maybeWord(this.type);
        }
        if (this.name) {
          this.maybeWord(this.name);
        }
        this.expect(';');
        this.end = this.pos.i;
        break;
      }
      let label;
      if (this.text[this.pos.i] === ':') {
        label = nextWord;
        this.pos.i++;
        this.advanceWhitespace();
        nextWord = this.getNextWord();
      } if (nextWord === 'process') {
        const processParser = new ProcessParser(this.text, this.pos, this.file, architecture);
        architecture.processes.push(processParser.parse(label));
      } else if (nextWord === 'if') {
        this.debug('parse if generate ' + label);
        let conditionI = this.pos.i;
        let condition = this.advancePast(/^\bgenerate/i);
        const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, architecture, label);
        const ifGenerate = (subarchitecture.parse(true, 'generate') as OIfGenerate);
        ifGenerate.condition = condition;
        ifGenerate.conditionReads = this.extractReadsOrWrite(ifGenerate, condition, conditionI);
        architecture.generates.push(ifGenerate);

      } else if (nextWord === 'for') {
        this.debug('parse for generate');
        let variable = this.advancePast(/^\bin/i);
        let start = this.advancePast(/^\b(to|downto)/i);
        let end = this.advancePast(/^\bgenerate/i);
        const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, architecture, label);
        const generate: OForGenerate = (subarchitecture.parse(true, 'generate') as OForGenerate);
        generate.start = start;
        generate.end = end;
        generate.variable = variable;
        architecture.generates.push(generate);
      } else if (nextWord === 'with') {
        console.error('WTF');
      } else { // TODO  others
        if (label) {
          const instantiationParser = new InstantiationParser(this.text, this.pos, this.file, architecture);
          architecture.instantiations.push(instantiationParser.parse(nextWord, label));
        } else { // statement;
          this.reverseWhitespace();
          this.pos.i -= nextWord.length;
          const assignmentParser = new AssignmentParser(this.text, this.pos, this.file, architecture);
          const assignment = assignmentParser.parse();
          architecture.assignments.push(assignment);

          continue;
        }
      }
    }
    return architecture;
  }


  parseDefinitionBlock(parent: OArchitecture, optional: boolean = false) {
    const signals: OSignal[] = [];
    const types: OType[] = [];
    let nextWord = this.getNextWord({ consume: false }).toLowerCase();
    let multiSignals: string[] = [];
    while (nextWord !== 'begin') {
      this.getNextWord();
      if (nextWord === 'signal' || nextWord === 'constant') {
        const signal = new OSignal(parent, this.pos.i);

        signal.constant = nextWord === 'constant';
        signal.name = this.getNextWord();
        if (this.text[this.pos.i] === ',') {
          multiSignals.push(name);
          this.expect(',');
          continue;
        }
        this.expect(':');
        let type = this.getType();
        if (type.indexOf(':=') > -1) {
          const split = type.split(':=');
          type = split[0].trim();
          signal.defaultValue = split[1].trim();

        }
        for (const multiSignalName of multiSignals) {
          const multiSignal = new OSignal(parent, -1);
          Object.assign(signal, multiSignal);
          multiSignal.name = multiSignalName;
          signals.push(multiSignal);
        }
        signals.push(signal);
        multiSignals = [];
      } else if (nextWord === 'attribute') {
        this.advancePast(';');
      } else if (nextWord === 'type') {
        const type = new OType(parent, this.pos.i);
        type.name = this.getNextWord();
        this.expect('is');
        this.expect('(');
        let position = this.pos.i;
        type.states = this.advancePast(')').split(',').map(type => {
          const state = new OState(type, position);
          const match = type.match(/^\s*/);
          if (match) {
            state.begin = position + match[0].length;
          } else {
            state.begin = position;
          }
          state.name = type.trim();
          state.end = state.begin + state.name.length;
          position += type.length;
          position++;
          return state;
        });
        types.push(type);
        this.expect(';');
      } else if (nextWord === 'component') {
        this.advancePast('end');
        this.maybeWord('component');
        this.expect(';');
      } else if (optional && signals.length === 0 && types.length === 0) {
        return { signals, types };
      } else {
        throw new ParserError(`Unknown Ding: '${nextWord}' on line ${this.getLine()}`, this.pos.i);
      }
      nextWord = this.getNextWord({ consume: false }).toLowerCase();
    }
    this.expect('begin');
    return { signals, types };
  }

}
