import {ParserBase} from './parser-base';
import {ProcessParser} from './process-parser';
import {InstantiationParser} from './instantiation-parser';
import {ParserPosition} from './parser-position';
import {OSignal, OType, OArchitecture, OGenerate, ParserError} from './objects';
import {AssignmentParser} from './assignment-parser';

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

    const {signals, types} = this.parseDefinitionBlock(architecture);
    architecture.signals = signals;
    architecture.types = types;

    this.expect('begin');
    while (this.pos.i < this.text.length) {
      if (this.text[this.pos.i].match(/\s/)) {
        this.pos.i++;
        continue;
      }
      let nextWord = this.getNextWord().toLowerCase();
      if (nextWord === 'end') {
        this.maybeWord(structureName);
        this.maybeWord(this.type);
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
      } else if (nextWord === 'for') {
        let variable = this.getNextWord();
        this.expect('in');
        let start = this.getNextWord();
        this.expect('to');
        let end = this.getNextWord();
        this.expect('generate');
        const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, architecture, label);
        const generate = (subarchitecture.parse(true, 'generate') as OGenerate);
        generate.start = start;
        generate.end = end;
        generate.variable = variable;
        architecture.generates.push(generate);
      } else { // TODO for generate and others
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


  parseDefinitionBlock(parent: OArchitecture) {
    const signals: OSignal[] = [];
    const types: OType[] = [];
    let nextWord = this.getNextWord({consume: false}).toLowerCase();
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
        type.states = this.advancePast(')').split(',').map(type => type.trim());
        types.push(type);
        this.expect(';');
      } else if (nextWord === 'component') {
        this.advancePast('end');
        this.maybeWord('component');
        this.expect(';');
      } else {
        throw new ParserError(`Unknown Ding, ${nextWord}`, this.pos.i);
      }
      nextWord = this.getNextWord({consume: false});
    }
    return {signals, types};
  }

}
