import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position';
import {OPort, OGeneric, OEntity} from './objects';

export class EntityParser extends ParserBase{
  constructor(text: string, pos: ParserPosition, file: string) {
    super(text, pos, file);
    this.debug(`start`);
    this.start = pos.i;
  }
  parse(): OEntity {
    const entity = new OEntity(this.pos.i);
    entity.name = this.getNextWord();
    this.expect('is');

    while (this.pos.i < this.text.length) {
      if (this.text[this.pos.i].match(/\s/)) {
        this.pos.i++;
        continue;
      }
      let nextWord = this.getNextWord().toLowerCase();
      if (nextWord == 'port') {
        entity.ports = this.parsePortsAndGenerics(false);
      } else if (nextWord == 'generic') {
        entity.generics = this.parsePortsAndGenerics(true);
      } else if(nextWord == 'end') {
        this.maybeWord('entity');
        this.maybeWord(entity.name);
        this.expect(';');
        break;
      }
    }
    this.end = this.pos.i;
    return entity;
  }
  parsePortsAndGenerics(generics: false):OPort[];
  parsePortsAndGenerics(generics: true):OGeneric[];
  parsePortsAndGenerics(generics = false) {
    this.debug('start ports');
    this.expect('(');
    let multiPorts: string[] = [];
    const ports = [];
    while (this.pos.i < this.text.length) {
      if (this.text[this.pos.i].match(/\s/)) {
        this.pos.i++;
        continue;
      }
      let port;
      if (generics) {
        port = new OGeneric(this.pos.i);
      } else {
        port = new OPort(this.pos.i);
      }

      if (this.text[this.pos.i] === ')') {
        this.pos.i++;
        this.advanceWhitespace();
        this.expect(';');
        break;
      }
      port.name = this.getNextWord();
      if (this.text[this.pos.i] == ',') {
        this.expect(',');
        multiPorts.push(port.name);
        continue;
      }
      this.expect(':');
      let directionString;
      if (generics === false) {
        directionString = this.getNextWord({consume: false});
        if (directionString !== 'in' && directionString !== 'out' && directionString !== 'inout' && port instanceof OPort) {
          port.direction = 'inout';
        } else {
          this.getNextWord(); //consume direction
        }

      }
      const {type, defaultValue} = this.getTypeDefintion();
      port.type = type;
      port.defaultValue = defaultValue;
      ports.push(port);
      for (const multiPortName of multiPorts) {
        const multiPort = new OPort();
        Object.assign(port, multiPort);
        multiPort.name = multiPortName;
        ports.push(multiPort);
      }
      multiPorts = [];
    }
    return ports;
  }
  getTypeDefintion() {
    let type = '';
    let braceLevel = 0;
    while (this.text[this.pos.i].match(/[^);:]/) || braceLevel > 0) {
      type += this.text[this.pos.i];
      if (this.text[this.pos.i] == '(') {
        braceLevel++;
      } else if (this.text[this.pos.i] == ')') {
        braceLevel--;
      }
      this.pos.i++;
    }
    let defaultValue = '';
    if (this.text[this.pos.i] === ':') {
      this.pos.i += 2;
      while (this.text[this.pos.i].match(/[^);]/) || braceLevel > 0) {

        defaultValue += this.text[this.pos.i];
        if (this.text[this.pos.i] == '(') {
          braceLevel++;
        } else if (this.text[this.pos.i] == ')') {
          braceLevel--;
        }
        this.pos.i++;
      }
    }

    if (this.text[this.pos.i] == ';') {
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
