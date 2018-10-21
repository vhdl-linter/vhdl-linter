import {ParserBase} from './parser-base';
import {ParserPosition} from './parser-position';

export class EntityParser extends ParserBase{
  name: string;
  ports: IPort[] = [];
  constructor(text: string, pos: ParserPosition) {
    super(text, pos);
    this.start = pos.i;
  }
  parse(): IEntity {
    this.name = this.getNextWord();
    this.expect('is');

    while (this.pos.i < this.text.length) {
      if (this.text[this.pos.i].match(/\s/)) {
        this.pos.i++;
        continue;
      }
      let nextWord = this.getNextWord().toLowerCase();
      if (nextWord == 'port') {
        this.parsePorts();
      } else if(nextWord == 'end') {
        this.maybeWord('entity');
        this.maybeWord(this.name);
        this.expect(';');
        break;
      }
    }
    this.end = this.pos.i;
    return {
      name: this.name,
      ports: this.ports
    }
  }
  parsePorts() {
    this.expect('(');
    let multiPort = [];
    while (this.pos.i < this.text.length) {
      if (this.text[this.pos.i].match(/\s/)) {
        this.pos.i++;
        continue;
      }
      if (this.text[this.pos.i] === ')') {
        this.pos.i++;
        this.advanceWhitespace();
        this.expect(';');
        break;
      }
      const name = this.getNextWord();
      if (this.text[this.pos.i] == ',') {
        this.expect(',');
        multiPort.push(name);
        continue;
      }
      this.expect(':');
      let directionString = this.getNextWord({consume: false});
      if (directionString !== 'in' && directionString !== 'out' && directionString !== 'inout') {
        directionString = 'inout';
      } else {
        this.getNextWord(); //consume direction
      }
      const type = this.getType();
      let direction = <'in'|'out'|'inout'>directionString;
      const port: IPort = {name, direction, type}
      for (const multiPortName of multiPort) {
        this.ports.push({name: multiPortName, direction, type});
      }
      multiPort = [];
      this.ports.push(port);
    }
  }
  getType() {
    let type = '';
    let braceLevel = 0;
    while (this.text[this.pos.i].match(/[^);]/) || braceLevel > 0) {
      type += this.text[this.pos.i];
      if (this.text[this.pos.i] == '(') {
        braceLevel++;
      } else if (this.text[this.pos.i] == ')') {
        braceLevel--;
      }
      this.pos.i++;
    }
    if (this.text[this.pos.i] == ';') {
      this.pos.i++;
    }
    this.advanceWhitespace();
    return type.trim();
  }
}
export interface IEntity {
  name: string;
  ports: IPort[];
}
export interface IPort {
    name: string;
    direction: 'in' | 'out' | 'inout';
    type: string;
}
