import { ParserBase } from './parser-base';
import { ProcessParser } from './process-parser';
import { InstantiationParser } from './instantiation-parser';
import { ParserPosition } from './parser-position';
import { OSignal, OType, OArchitecture, ParserError, OState, OForGenerate, OIfGenerate, OFunction, OFile } from './objects';
import { AssignmentParser } from './assignment-parser';

export class ArchitectureParser extends ParserBase {
  name: string;
  type: string;
  constructor(text: string, pos: ParserPosition, file: string, private parent: OArchitecture|OFile, name?: string) {
    super(text, pos, file);
    this.debug('start');
    this.start = pos.i;
    if (name) {
      this.name = name;
    }
  }
  parse(): OArchitecture;
  parse(skipStart: boolean, structureName: 'generate'): OForGenerate;
  parse(skipStart: boolean, structureName: 'generate', ifGenerate: true): OIfGenerate;
  parse(skipStart = false, structureName: 'architecture' | 'generate' = 'architecture', ifGenerate: boolean = false): OArchitecture|OForGenerate|OIfGenerate {
    let architecture;
    if (structureName === 'architecture') {
      architecture = new OArchitecture(this.parent, this.pos.i);
    } else {
      if (ifGenerate) {
        architecture = new OIfGenerate(this.parent, this.pos.i);
      } else {
        architecture = new OForGenerate(this.parent, this.pos.i);
      }
    }
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
//       console.log(nextWord, 'nextWord');
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
        this.debug('parse label ' + label);
        this.pos.i++;
        this.advanceWhitespace();
        nextWord = this.getNextWord();
      } if (nextWord === 'process') {
        const processParser = new ProcessParser(this.text, this.pos, this.file, architecture);
        architecture.processes.push(processParser.parse(label));

      } else if (nextWord === 'for') {
        this.debug('parse for generate');
        let variable = this.advancePast(/\bin\b/i);
        let start = this.advancePast(/\b(to|downto)\b/i);
        let end = this.advancePast(/\bgenerate\b/i);
        const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, architecture, label);
        const generate: OForGenerate = subarchitecture.parse(true, 'generate');
        generate.start = start;
        generate.end = end;
        generate.variable = variable;
        console.log(generate, generate.constructor.name);
        architecture.generates.push(generate);
      } else if (nextWord === 'if') {
        let conditionI = this.pos.i;
        let condition = this.advancePast(/\bgenerate\b/i);
        this.debug('parse if generate ' + label);
        const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, architecture, label);
        const ifGenerate = subarchitecture.parse(true, 'generate', true);
        ifGenerate.conditions = [condition].concat(ifGenerate.conditions);
        ifGenerate.conditionReads = this.extractReads(ifGenerate, condition, conditionI).concat(ifGenerate.conditionReads);
        architecture.generates.push(ifGenerate);
      } else if (nextWord === 'elsif') {
        if (!(this.parent instanceof OArchitecture)) {
          throw new ParserError('Found elsif generate without preceding if generate', this.pos.i);
        }
        this.debug('parse elsif generate ' + this.name);
        let conditionI = this.pos.i;
        let condition = this.advancePast(/\bgenerate\b/i);
        (architecture as OIfGenerate).conditions = [condition].concat((architecture as OIfGenerate).conditions);
        (architecture as OIfGenerate).conditionReads = this.extractReads(architecture, condition, conditionI).concat((architecture as OIfGenerate).conditionReads);
      } else if (nextWord === 'else') {
        if (!(this.parent instanceof OArchitecture)) {
          throw new ParserError('Found Else generate without preceding if generate', this.pos.i);
        }
        this.debug('parse else generate ' + name);
        this.advancePast(/\bgenerate\b/i);
      } else if (nextWord === 'with') {
        console.error('WTF');
      } else if (nextWord === 'report' || nextWord === 'assert') {
        console.log('report');
        this.advancePast(';');
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
    this.debug('finished parse');
    return architecture;
  }


  parseDefinitionBlock(parent: OArchitecture, optional: boolean = false) {
    const signals: OSignal[] = [];
    const types: OType[] = [];
    let nextWord = this.getNextWord({ consume: false }).toLowerCase();
    let multiSignals: string[] = [];
    while (nextWord !== 'begin') {
      if (nextWord === 'signal' || nextWord === 'constant') {
        this.getNextWord();
        const signal = new OSignal(parent, this.pos.i);

        signal.constant = nextWord === 'constant';
        signal.name = this.getNextWord();
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
          const multiSignal = new OSignal(parent, -1);
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
        const type = new OType(parent, this.pos.i);
        type.name = this.getNextWord();
        this.expect('is');
        if (this.text[this.pos.i] === '(') {
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
        } else {
          this.advancePast(';');
        }
      } else if (nextWord === 'component') {
        this.getNextWord();
        const componentName = this.getNextWord();
        this.advancePast('end', {allowSemicolon: true});
        this.maybeWord('component');
        this.maybeWord(componentName);
        this.expect(';');
      } else if (nextWord === 'function') {
        this.getNextWord();
        const func = new OFunction(parent, this.pos.i);
        func.name = this.getNextWord();
        this.advancePast('end', {allowSemicolon: true});
        let word = this.getNextWord({consume: false});
        while (['case', 'loop', 'if'].indexOf(word.toLowerCase()) > -1) {
          this.advancePast('end', {allowSemicolon: true});
          word = this.getNextWord({consume: false});
        }
        this.advancePast(';');
        parent.functions.push(func);
      } else if (optional && signals.length === 0 && types.length === 0) {
        return { signals, types };
      } else {
        this.getNextWord();
        throw new ParserError(`Unknown Ding: '${nextWord}' on line ${this.getLine()}`, this.pos.i);
      }
      nextWord = this.getNextWord({ consume: false }).toLowerCase();
    }
    this.expect('begin');
    return { signals, types };
  }

}
