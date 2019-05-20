import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position';
import {OInstantiation, OMapping, ParserError} from './objects';

export class InstantiationParser extends ParserBase {
  constructor(text: string, pos: ParserPosition, file: string, private parent: object) {
    super(text, pos, file);
    this.debug(`start`);

  }
  parse(nextWord: string, label?: string): OInstantiation {
    const instantiation = new OInstantiation(this.parent, this.pos.i);
    instantiation.label = label;
    instantiation.entityInstantiation = false;
    if (nextWord === 'entity') {
      instantiation.entityInstantiation = true;
      nextWord = this.getNextWord({re: /[\w.]/});
      let libraryMatch = nextWord.match(/^(.*)\./i);
      if (!libraryMatch) {
        throw new ParserError(`Can not parse entity instantiation`, this.pos.i);
      }
      instantiation.library = libraryMatch[1];
    }
    instantiation.componentName = nextWord.replace(/^.*\./, '');
    let hasPortMap = false;
    let lastI;
    while (this.text[this.pos.i] !== ';') {
      nextWord = this.getNextWord();
//       console.log(nextWord, 'nextWord');
      if (nextWord === 'port') {
        hasPortMap = true;
        this.expect('map');
        this.expect('(');
        instantiation.portMappings = this.parseMapping(instantiation);

      } else if (nextWord === 'generic') {
        this.expect('map');
        this.expect('(');
        instantiation.genericMappings = this.parseMapping(instantiation);
      }
      if (lastI === this.pos.i) {
        throw new ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos.i);
      }
      lastI = this.pos.i;
    }
    this.expect(';');
    if (!hasPortMap) {
      throw new Error(`Instantiation has no Port Map. line ${this.getLine()}`);
    }
    return instantiation;
  }
  parseMapping(instantiation: object) {
    this.debug(`parseMapping`);

    const mappings: OMapping[] = [];

    while (this.pos.i < this.text.length) {
      const mapping = new OMapping(instantiation, this.pos.i);
      const mappingNameI = this.pos.i;
      mapping.name = this.extractReads(mapping, this.getNextWord({re: /[^=]/}), mappingNameI);
      this.expect('=>');
      let mappingStringStartI = this.pos.i;
      let mappingString = '';
      let braceLevel = 0;
      while (this.text[this.pos.i].match(/[,)]/) === null || braceLevel > 0) {
        mappingString += this.text[this.pos.i];
        if (this.text[this.pos.i] === '(') {
          braceLevel++;
        } else if (this.text[this.pos.i] === ')') {
          braceLevel--;
        }
        this.pos.i++;
      }
      // mapping.name = mapping.name.trim();
      if (mappingString.trim().toLowerCase() !== 'open') {
        mapping.mappingIfInput = this.extractReads(mapping, mappingString, mappingStringStartI);
        mapping.mappingIfOutput = this.extractReadsOrWrite(mapping, mappingString, mappingStringStartI);
      } else {
        mapping.mappingIfInput = [];
        mapping.mappingIfOutput = [[], []];
      }
      mappings.push(mapping);
      if (this.text[this.pos.i] === ',') {
        this.pos.i++;
        this.advanceWhitespace();
      } else if (this.text[this.pos.i] === ')') {
        this.pos.i++;
        break;
      }
    }
    return mappings;
  }
  // parseName(text: string): string {
  //   const convertFunctions = ['std_logic_vector', 'std_ulogic_vector', 'unsigned', 'signed', 'to_integer', 'to_unsigned', 'to_signed'];
  //   const re = new RegExp('^(' + convertFunctions.join('|') + ')\\s*', 'i');
  //   let match: RegExpExecArray | null;
  //   while (match = re.exec(text)) {
  //     text = text.substr(match[0].length + 1);
  //     let braceLevel = 0;
  //     for (let i = 0; i < text.length; i++) {
  //         if (text[i] === '(') {
  //           braceLevel++;
  //         } if (text[i] === ')') {
  //           if (braceLevel > 0) {
  //             braceLevel--;
  //           } else {
  //             text = text.substring(0, i) + text.substring(i + 1);
  //           }
  //         }
  //     }
  //   }
  //   text = text.replace(/\(.*\)/, '');
  //   return text;
  // }
}
