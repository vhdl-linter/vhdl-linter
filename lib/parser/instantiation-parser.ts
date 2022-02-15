import {ParserBase} from './parser-base';
import {OInstantiation, OAssociation, ParserError, ObjectBase, OAssociationFormal, OI, OAssociationList, OIRange, OGenericMap, OPortMap} from './objects';
import { TextEdit } from 'vscode-languageserver';

export class InstantiationParser extends ParserBase {
  constructor(text: string, pos: OI, file: string, private parent: ObjectBase) {
    super(text, pos, file);
    this.debug(`start`);

  }
  parse(nextWord: string, label: string|undefined, startI: number, procedure: boolean): OInstantiation {
    const instantiation = new OInstantiation(this.parent, startI, this.getEndOfLineI());
    instantiation.label = label;
    if (procedure) {
      instantiation.type = 'procedure';
      nextWord = this.getNextWord({re: /^[\w.]+/}).toLowerCase();
    } else {
      instantiation.type = 'component';
      if (nextWord === 'entity') {
        instantiation.type = 'entity';
        nextWord = this.getNextWord({re: /^[\w.]+/});
        let libraryMatch = nextWord.match(/^(.*)\./i);
        if (!libraryMatch) {
          throw new ParserError(`Can not parse entity instantiation`, this.pos.getRangeToEndLine());
        }
        instantiation.library = libraryMatch[1];
      } else if (nextWord === 'component') {
        nextWord = this.getNextWord({re: /^[\w.]+/}).toLowerCase();
      }
    }
    instantiation.componentName = nextWord.replace(/^.*\./, '');
    let hasPortMap = false;
    let lastI;
    while (this.text[this.pos.i] !== ';') {
      const savedI = this.pos.i;
      //       console.log(nextWord, 'nextWord');
      if (procedure) {
        this.expect('(');
        instantiation.portMap = this.parseMapping(savedI, instantiation);
        hasPortMap = true;
      } else {
        nextWord = this.getNextWord().toLowerCase();
        if (nextWord === 'port') {
          hasPortMap = true;
          this.expect('map');
          this.expect('(');
          instantiation.portMap = this.parseMapping(savedI, instantiation);

        } else if (nextWord === 'generic') {
          this.expect('map');
          this.expect('(');
          instantiation.genericMap = this.parseMapping(savedI, instantiation, true);
        }
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
      const mapping = new OAssociation(map, this.pos.i, this.getEndOfLineI());
      const mappingNameI = this.pos.i;
      mapping.formalPart = this.extractReads(mapping, this.getNextWord({re: /^[^=]+/}), mappingNameI, true) as OAssociationFormal[];
      for (const namePart of mapping.formalPart) {
        Object.setPrototypeOf(namePart, OAssociationFormal.prototype);
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
        mapping.actualIfInput = this.extractReads(mapping, mappingString, mappingStringStartI);
        if (genericMapping === false) {
          mapping.actualIfOutput = this.extractReadsOrWrite(mapping, mappingString, mappingStringStartI);
        }
      } else {
        mapping.actualIfInput = [];
        mapping.actualIfOutput = [[], []];
      }
      map.children.push(mapping);
      if (this.text[this.pos.i] === ',') {
        const beforeI = this.pos.i;
        this.pos.i++;
        this.advanceWhitespace();
        if (this.text[this.pos.i] === ')') {
          const range = new OIRange(mapping, beforeI, beforeI + 1);
          range.start.character = 0;

          throw new ParserError(`Unexpected ',' at end of port map`, range, {
            message: `Remove ','`,
            edits: [TextEdit.del(new OIRange(mapping, beforeI, beforeI + 1))]
          });
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
