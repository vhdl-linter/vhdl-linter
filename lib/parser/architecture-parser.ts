import {ParserBase} from './parser-base';
import {ProcessParser, IProcess} from './process-parser';
import {InstantiationParser, IInstantiation} from './instantiation-parser';
import {ParserPosition} from './parser-position';

export class ArchitectureParser extends ParserBase{
  name: string;
  type: string;
  constructor(text: string, pos: ParserPosition, name?: string) {
    super(text, pos);
    this.start = pos.i;
    if (name) {
      this.name = name;
    }
  }
  parse(skipStart = false, structureName = 'architecture'): IArchitecture {
    if (skipStart !== true) {
      this.type = this.getNextWord();
      this.expect('of');
      this.name = this.getNextWord();
      this.expect('is');
    }
    const signals = this.parseSignals();
    const processes: IProcess[] = [];
    const instantiations = [];
    const generates = [];
    const statements = [];
    while (this.pos.i < this.text.length) {
      if (this.text[this.pos.i].match(/\s/)) {
        this.pos.i++;
        continue;
      }
      let nextWord = this.getNextWord().toLowerCase();
      if(nextWord == 'end') {
        this.maybeWord(structureName);
        this.maybeWord(this.type);
        this.expect(';');
        this.end = this.pos.i;
        break;
      }
      let label;
      if (this.text[this.pos.i] == ':') {
        label = nextWord;
        this.pos.i++;
        this.advanceWhitespace();
        nextWord = this.getNextWord();
      } if (nextWord == 'process') {
        const processParser = new ProcessParser(this.text, this.pos);
        processes.push(processParser.parse(label));
      } else if (nextWord == 'for') {
        let variable = this.getNextWord();
        this.expect('in');
        let start = this.getNextWord();
        this.expect('to');
        let end = this.getNextWord();
        this.expect('generate');
        const subarchitecture = new ArchitectureParser(this.text, this.pos, label);
        const generate = (subarchitecture.parse(true, 'generate') as IGenerate);
        generate.start = start;
        generate.end = end;
        generate.variable = variable;
        generates.push(generate);
      } else { //TODO for generate and others
        if (label) {
          const instantiationParser = new InstantiationParser(this.text, this.pos);
          instantiations.push(instantiationParser.parse(nextWord, label));
        } else { //statement;
          const statement = nextWord + this.advancePast(';');
          statements.push(statement);
          continue;
        }
      }




    }
    return {
      signals,
      processes,
      instantiations,
      generates,
      statements
    }
  }


  parseSignals() {
    const signals: ISignal[] = [];
    let nextWord = this.getNextWord();
    while (nextWord == 'signal') {
      const name = this.getNextWord();
      this.expect(':');
      let type = this.getType();
      let defaultValue;
      if (type.indexOf(':=') > -1) {
        const split = type.split(':=');
        type = split[0].trim();
        defaultValue = split[1].trim();
      }
      signals.push({name, type, defaultValue});
      nextWord = this.getNextWord();
    }
    if (nextWord !== 'begin') {
      if (signals.length > 0) {
        throw new Error(`Error on ${this.getLine()} found ${nextWord}`);
      } else {
        this.reverseWhitespace();
        this.pos.i -= nextWord.length;
      }
    }
    return signals;
  }
  getType() {
    let type = '';
    while (this.text[this.pos.i].match(/[^;]/)) {
      type += this.text[this.pos.i];
      this.pos.i++;
    }
    this.expect(';');
    this.advanceWhitespace();
    return type;
  }
}
export interface IArchitecture {
  signals: ISignal[];
  processes: IProcess[];
  instantiations: IInstantiation[];
  generates: IGenerate[];
  statements: string[];
}
export interface IGenerate extends IArchitecture {
  variable: string;
  start: string;
  end: string;
}
export interface ISignal {
    name: string;
    type: string;
    defaultValue?: string;
}
