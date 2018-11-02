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
    if (nextWord === 'entity') {
      nextWord = this.getNextWord({re: /[\w.]/});
    }
    instantiation.componentName = nextWord;
    let hasPortMap = false;
    let lastI;
    while (this.text[this.pos.i] !== ';') {
      nextWord = this.getNextWord();
      console.log(nextWord, 'nextWord');
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
      mapping.name = this.getNextWord({re: /[^=]/});
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
      mapping.name = mapping.name.trim();
      mapping.mapping = this.extractReads(mapping, mappingString, mappingStringStartI);
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
}
