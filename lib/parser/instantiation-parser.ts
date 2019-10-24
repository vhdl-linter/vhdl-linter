import {ParserBase} from './parser-base';
import {OInstantiation, OMapping, ParserError, ObjectBase, OReadOrMappingName, OI, OMap, OIRange} from './objects';

export class InstantiationParser extends ParserBase {
  constructor(text: string, pos: OI, file: string, private parent: ObjectBase) {
    super(text, pos, file);
    this.debug(`start`);

  }
  parse(nextWord: string, label: string, startI: number): OInstantiation {
    const instantiation = new OInstantiation(this.parent, startI, this.getEndOfLineI());
    instantiation.label = label;
    instantiation.entityInstantiation = false;
    if (nextWord === 'entity') {
      instantiation.entityInstantiation = true;
      nextWord = this.getNextWord({re: /^[\w.]+/});
      let libraryMatch = nextWord.match(/^(.*)\./i);
      if (!libraryMatch) {
        throw new ParserError(`Can not parse entity instantiation`, this.pos);
      }
      instantiation.library = libraryMatch[1];
    }
    instantiation.componentName = nextWord.replace(/^.*\./, '');
    let hasPortMap = false;
    let lastI;
    while (this.text[this.pos.i] !== ';') {
      const savedI = this.pos.i;
      nextWord = this.getNextWord().toLowerCase();
//       console.log(nextWord, 'nextWord');
      if (nextWord === 'port') {
        hasPortMap = true;
        this.expect('map');
        this.expect('(');
        instantiation.portMappings = this.parseMapping(savedI, instantiation);

      } else if (nextWord === 'generic') {
        this.expect('map');
        this.expect('(');
        instantiation.genericMappings = this.parseMapping(savedI, instantiation);
      }
      if (lastI === this.pos.i) {
        throw new ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos);
      }
      lastI = this.pos.i;
    }
    instantiation.range.end.i = this.expect(';');
    if (!hasPortMap) {
      throw new Error(`Instantiation has no Port Map. line ${this.getLine()}`);
    }
    return instantiation;
  }
  parseMapping(startI: number, instantiation: OInstantiation) {
    this.debug(`parseMapping`);

    const mappings = new OMap(instantiation, startI, this.pos.i);

    while (this.pos.i < this.text.length) {
      const mapping = new OMapping(instantiation, this.pos.i, this.getEndOfLineI());
      const mappingNameI = this.pos.i;
      mapping.name = this.extractReads(mapping, this.getNextWord({re: /^[^=]+/}), mappingNameI) as OReadOrMappingName[];
      for (const namePart of mapping.name) {
        Object.setPrototypeOf(namePart, OReadOrMappingName.prototype);
      }
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
      mappings.children.push(mapping);
      if (this.text[this.pos.i] === ',') {
        this.pos.i++;
        this.advanceWhitespace();
      } else if (this.text[this.pos.i] === ')') {
        this.pos.i++;
        mappings.range.end.i = this.pos.i;
        this.advanceWhitespace();
        break;
      }
    }
    return mappings;
  }
}
