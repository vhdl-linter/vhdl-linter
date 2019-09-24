import { ParserBase } from './parser-base';
import { ProcessParser } from './process-parser';
import { InstantiationParser } from './instantiation-parser';
import { ParserPosition } from './parser-position';
import { OSignal, OType, OArchitecture, ParserError, OState, OForGenerate, OIfGenerate, OFunction, OFile, ObjectBase} from './objects';
import { AssignmentParser } from './assignment-parser';
import { DeclarativePartParser } from './declarative-part-parser';

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
  parse(skipStart: boolean, structureName: 'generate', ifGenerate: true, noElse: boolean): OIfGenerate;
  parse(skipStart = false, structureName: 'architecture' | 'generate' = 'architecture', ifGenerate: boolean = false, noElse: boolean = true): OArchitecture|OForGenerate|OIfGenerate {
    this.debug(`parse, noElse: ${noElse}`);
    let architecture;
    if (structureName === 'architecture') {
      architecture = new OArchitecture(this.parent, this.pos.i);
    } else if (ifGenerate) {
      architecture = new OIfGenerate(this.parent, this.pos.i);
    } else {
      architecture = new OForGenerate(this.parent, this.pos.i);
    }
    if (skipStart !== true) {
      this.type = this.getNextWord();
      this.expect('of');
      this.name = this.getNextWord();
      this.expect('is');
    }

    const { signals, types } = new DeclarativePartParser(this.text, this.pos, this.file, architecture).parse(structureName !== 'architecture');
    this.maybeWord('begin');
    architecture.signals = signals;
    architecture.types = types;

    while (this.pos.i < this.text.length) {
      if (this.text[this.pos.i].match(/\s/)) {
        this.pos.i++;
        continue;
      }
      let nextWord = this.getNextWord({consume: false});
//       console.log(nextWord, 'nextWord');
      if (nextWord === 'end') {
        if (ifGenerate && noElse) {
          break;
        }
        this.getNextWord();
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
      const savedI = this.pos.i;
      const regex = new RegExp(`^${nextWord}\\s*:`, 'i');
      if (this.text.substr(this.pos.i).match(regex)) {
        label = this.getNextWord({withCase: true});
        this.debug('parse label ' + label);
        this.pos.i++;
        this.advanceWhitespace();
        nextWord = this.getNextWord();
      }

      if (nextWord === 'process') {
        this.getNextWord();
        const processParser = new ProcessParser(this.text, this.pos, this.file, architecture);
        architecture.processes.push(processParser.parse(label));

      } else if (nextWord === 'for') {
        this.debug('parse for generate');
        let variable = this.advancePast(/\bin\b/i);
        let start = this.advancePast(/\b(to|downto|'range)\b/i);
        let end = this.advancePast(/\bgenerate\b/i);
        const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, architecture, label);
        const generate: OForGenerate = subarchitecture.parse(true, 'generate');
        generate.startI = savedI;
        generate.start = start;
        generate.end = end;
        generate.variable = variable;
//        console.log(generate, generate.constructor.name);
        architecture.generates.push(generate);
      } else if (nextWord === 'if') {
        // this.getNextWord();
        let conditionI = this.pos.i;
        let condition = this.advancePast(/\bgenerate\b/i);
        this.debug('parse if generate ' + label);
        const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, architecture, label);
        const ifGenerateObject = subarchitecture.parse(true, 'generate', true, false);
        ifGenerateObject.startI = savedI;
        if (ifGenerateObject.conditions) {
          ifGenerateObject.conditions = [condition].concat(ifGenerateObject.conditions);
          ifGenerateObject.conditionReads = this.extractReads(ifGenerateObject, condition, conditionI).concat(ifGenerateObject.conditionReads);
        } else {
          ifGenerateObject.conditions = [condition];
          ifGenerateObject.conditionReads = this.extractReads(ifGenerateObject, condition, conditionI);
        }
        architecture.generates.push(ifGenerateObject);
      } else if (nextWord === 'elsif') {
        if (noElse && !ifGenerate) {
          throw new ParserError('elsif generate without if generate', this.pos.i);
        } else if (noElse) {
          break;
        }
        let conditionI = this.pos.i;
        let condition = this.advancePast(/\bgenerate\b/i);
        this.debug('parse elsif generate ' + label);
        const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, architecture.parent as OArchitecture, label);
        const ifGenerateObject = subarchitecture.parse(true, 'generate', true, true);
        ifGenerateObject.startI = savedI;
        if (ifGenerateObject.conditions) {
          ifGenerateObject.conditions = [condition].concat(ifGenerateObject.conditions);
          ifGenerateObject.conditionReads = this.extractReads(ifGenerateObject, condition, conditionI).concat(ifGenerateObject.conditionReads);
        } else {
          ifGenerateObject.conditions = [condition];
          ifGenerateObject.conditionReads = this.extractReads(ifGenerateObject, condition, conditionI);
        }
        (architecture.parent as OArchitecture).generates.push(ifGenerateObject);
      } else if (ifGenerate && nextWord === 'else') {
          if (noElse && !ifGenerate) {
            throw new ParserError('else generate without if generate', this.pos.i);
          } else if (noElse) {
            break;
          }
          let conditionI = this.pos.i;
          let condition = this.advancePast(/\bgenerate\b/i);
          this.debug('parse else generate ' + label);
          const subarchitecture = new ArchitectureParser(this.text, this.pos, this.file, architecture.parent as OArchitecture, label);
          const ifGenerateObject = subarchitecture.parse(true, 'generate', true, true);
          ifGenerateObject.startI = savedI;
          if (ifGenerateObject.conditions) {
            ifGenerateObject.conditions = [condition].concat(ifGenerateObject.conditions);
            ifGenerateObject.conditionReads = this.extractReads(ifGenerateObject, condition, conditionI).concat(ifGenerateObject.conditionReads);
          } else {
            ifGenerateObject.conditions = [condition];
            ifGenerateObject.conditionReads = this.extractReads(ifGenerateObject, condition, conditionI);
          }
          (architecture.parent as OArchitecture).generates.push(ifGenerateObject);
        // this.getNextWord();
        // if (!(this.parent instanceof OArchitecture)) {
        //   throw new ParserError('Found Else generate without preceding if generate', this.pos.i);
        // }
        // this.debug('parse else generate ' + this.name);
        // this.advancePast(/\bgenerate\b/i);
      } else if (nextWord === 'with') {
        this.getNextWord();
        this.advancePast(';');
        this.debug('WTF ' + this.file);
      } else if (nextWord === 'report' || nextWord === 'assert') {
        this.getNextWord();
//        console.log('report');
        this.advancePast(';');
      } else { // TODO  others
        if (label) {
          const instantiationParser = new InstantiationParser(this.text, this.pos, this.file, architecture);
          architecture.instantiations.push(instantiationParser.parse(nextWord, label));
        } else { // statement;
          this.getNextWord();
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


}
