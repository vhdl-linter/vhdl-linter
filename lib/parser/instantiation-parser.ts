import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position'
import {OInstantiation, OMapping} from './objects';

export class InstantiationParser extends ParserBase {
  constructor(text: string, pos: ParserPosition, file: string, private parent: object) {
    super(text, pos, file);
    this.debug(`start`);

  }
  parse(nextWord: string, label?: string): OInstantiation {
    const instantiation = new OInstantiation(this.parent, this.pos.i);
    instantiation.label = label;
    if (nextWord == 'entity') {
      nextWord = this.getNextWord({re: /[\w.]/});
    }
    instantiation.componentName = nextWord;
    let hasPortMap = false;
    while (this.text[this.pos.i] !== ';') {
      nextWord = this.getNextWord();
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

    }
    this.expect(';');
    if (!hasPortMap) {
      throw new Error(`Instantiation has no Port Map. line ${this.getLine()}`);
    }
    return instantiation;
  }
  parseMapping(instantiation: object) {
    const mappings: OMapping[] = [];

    while(this.pos.i < this.text.length) {
      const mapping = new OMapping(instantiation, this.pos.i);
      mapping.name = this.getNextWord({re: /[^=]/});
      this.expect('=>');
      mapping.mapping = '';
      let braceLevel = 0;
      while (this.text[this.pos.i].match(/[,)]/) === null || braceLevel > 0) {
        mapping.mapping += this.text[this.pos.i];
        if (this.text[this.pos.i] == '(') {
          braceLevel++;
        } else if (this.text[this.pos.i] == ')') {
          braceLevel--;
        }
        this.pos.i++;
      }
      mapping.name = mapping.name.trim();
      mapping.mapping = mapping.mapping.trim();
      mappings.push(mapping);
      if (this.text[this.pos.i] == ',') {
        this.pos.i++;
        this.advanceWhitespace();
      } else if (this.text[this.pos.i] == ')') {
        this.pos.i++;
        break;
      }
    }
    return mappings;
  }
}
