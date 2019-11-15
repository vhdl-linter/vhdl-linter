import {ParserBase} from './parser-base';
import {OInstantiation, OMapping, ParserError, ObjectBase, OMappingName, OI, OMap, OIRange, OGenericMap, OPortMap} from './objects';

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
        throw new ParserError(`Can not parse entity instantiation`, this.pos.getRangeToEndLine());
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
        instantiation.genericMappings = this.parseMapping(savedI, instantiation, true);
      }
      if (lastI === this.pos.i) {
        throw new ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos.getRangeToEndLine());
      }
      lastI = this.pos.i;
    }
    instantiation.range.end.i = this.expect(';');
    if (!hasPortMap) {
      throw new ParserError(`Instantiation has no Port Map`, this.pos.getRangeToEndLine());
    }
    return instantiation;
  }
  parseMapping(startI: number, instantiation: OInstantiation, genericMapping = false) {
    this.debug(`parseMapping`);

    const map = genericMapping ? new OGenericMap(instantiation, startI, this.pos.i) : new OPortMap(instantiation, startI, this.pos.i);

    while (this.pos.i < this.text.length) {
      const mapping = new OMapping(map, this.pos.i, this.getEndOfLineI());
      const mappingNameI = this.pos.i;
      mapping.name = this.extractReads(mapping, this.getNextWord({re: /^[^=]+/}), mappingNameI) as OMappingName[];
      for (const namePart of mapping.name) {
        Object.setPrototypeOf(namePart, OMappingName.prototype);
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
        if (genericMapping === false) {
          mapping.mappingIfOutput = this.extractReadsOrWrite(mapping, mappingString, mappingStringStartI);
        }
      } else {
        mapping.mappingIfInput = [];
        mapping.mappingIfOutput = [[], []];
      }
      map.children.push(mapping);
      if (this.text[this.pos.i] === ',') {
        const beforeI = this.pos.i;
        this.pos.i++;
        this.advanceWhitespace();
        if (this.text[this.pos.i] === ')') {
          throw new ParserError(`unexpected ','`, new OI(mapping, beforeI).getRangeToEndLine());
        }
      } else if (this.text[this.pos.i] === ')') {
        this.pos.i++;
        map.range.end.i = this.pos.i;
        this.advanceWhitespace();
        break;
      }
    }
    return map;
  }
}
