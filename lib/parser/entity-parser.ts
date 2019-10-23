import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position';
import { DeclarativePartParser } from './declarative-part-parser';
import {OPort, OGeneric, OEntity, ParserError, OFileWithEntity, OGenericActual, OGenericType} from './objects';

export class EntityParser extends ParserBase {
  constructor(text: string, pos: ParserPosition, file: string, private parent: OFileWithEntity) {
    super(text, pos, file);
    this.debug(`start`);
  }
  parse(): OEntity {
    const match = this.parent.originalText.match(/!\s*@library\s+(\S+)/i);
    const library = match ? match[1] : undefined;
    const entity = new OEntity(this.parent, this.pos.i, this.getEndOfLineI(), library);
    entity.name = this.getNextWord();
    this.expect('is');

    let lastI;
    while (this.pos.i < this.text.length) {
      if (this.text[this.pos.i].match(/\s/)) {
        this.pos.i++;
        continue;
      }
      let nextWord = this.getNextWord({consume: false}).toLowerCase();
      if (nextWord === 'port') {
        this.getNextWord();
        entity.ports = this.parsePortsAndGenerics(false, entity);
      } else if (nextWord === 'generic') {
        this.getNextWord();
        entity.generics = this.parsePortsAndGenerics(true, entity);
      } else if (nextWord === 'end') {
        this.getNextWord();
        this.maybeWord('entity');
        this.maybeWord(entity.name);
        this.expect(';');
        break;
      } else if (nextWord === 'begin') {
         this.advancePast(/(?=end)/i, {allowSemicolon: true});
      } else {
        new DeclarativePartParser(this.text, this.pos, this.file, entity).parse(true);
      }
      if (lastI === this.pos.i) {
        throw new ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos.i);
      }
      lastI = this.pos.i;
    }
    entity.endI = this.pos.i;

    return entity;
  }
  parsePortsAndGenerics(generics: false, entity: any): OPort[];
  parsePortsAndGenerics(generics: true, entity: any): OGeneric[];
  parsePortsAndGenerics(generics: false|true , entity: any): OPort[]|OGeneric[] {
    this.debug('start ports');
    this.expect('(');
    // let multiPorts: string[] = [];
    const ports = [];
    while (this.pos.i < this.text.length) {
      this.advanceWhitespace();
      let port = generics ?
        new OGenericActual(entity, this.pos.i, this.getEndOfLineI()) :
        new OPort(entity, this.pos.i, this.getEndOfLineI());

      if (this.text[this.pos.i] === ')') {
        this.pos.i++;
        this.advanceWhitespace();
        this.expect(';');
        break;
      }
      if (this.getNextWord({ consume: false }).toLowerCase() === 'type') {
        this.getNextWord();
        port = Object.setPrototypeOf(port, OGenericType.prototype);
        (port as OGenericType).name = this.getNextWord();
        ports.push(port);
        if (this.text[this.pos.i] === ';') {
          this.pos.i++;
          this.advanceWhitespace();
        }
      } else {
        port.name = this.getNextWord();
        if (this.text[this.pos.i] === ',') {
          this.expect(',');
          // multiPorts.push(port.name);
          continue;
        }
        this.expect(':');
        let directionString;
        if (port instanceof OPort) {
          directionString = this.getNextWord({consume: false});
          if (directionString !== 'in' && directionString !== 'out' && directionString !== 'inout') {
            port.direction = 'inout';
          } else {
            port.direction = directionString;
            this.getNextWord(); // consume direction
          }
        }
        const {type, defaultValue} = this.getTypeDefintion();
        port.type = type;
        port.defaultValue = defaultValue;
        ports.push(port);
        // for (const multiPortName of multiPorts) {
        //   const multiPort = new OPort(this.parent, -1);
        //   Object.assign(port, multiPort);
        //   multiPort.name = multiPortName;
        //   ports.push(multiPort);
        // }
        // multiPorts = [];
      }
    }
    return ports as any;
  }
  getTypeDefintion() {
    let type = '';
    let braceLevel = 0;
    while (this.text[this.pos.i].match(/[^);:]/) || braceLevel > 0) {
      type += this.text[this.pos.i];
      if (this.text[this.pos.i] === '(') {
        braceLevel++;
      } else if (this.text[this.pos.i] === ')') {
        braceLevel--;
      }
      this.pos.i++;
    }
    let defaultValue = '';
    if (this.text[this.pos.i] === ':') {
      this.pos.i += 2;
      while (this.text[this.pos.i].match(/[^);]/) || braceLevel > 0) {

        defaultValue += this.text[this.pos.i];
        if (this.text[this.pos.i] === '(') {
          braceLevel++;
        } else if (this.text[this.pos.i] === ')') {
          braceLevel--;
        }
        this.pos.i++;
      }
    }

    if (this.text[this.pos.i] === ';') {
      this.pos.i++;
    }
    this.advanceWhitespace();
    defaultValue = defaultValue.trim();
    if (defaultValue === '') {
      return {
        type: type.trim(),
      };

    }
    return {
      type: type.trim(),
      defaultValue: defaultValue
    };
  }
}
