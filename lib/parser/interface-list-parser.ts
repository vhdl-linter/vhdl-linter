import { OEntity, OGeneric, OI, OIRange, OName, OPackage, OPort, OSubprogram } from "./objects";
import { ParserBase } from "./parser-base";
import { SubprogramParser } from "./subprogram-parser";


export class InterfaceListParser extends ParserBase {
  constructor(text: string, pos: OI, file: string, private parent: OEntity | OSubprogram | OPackage) {
    super(text, pos, file);
    this.debug('start');
  }

  parse(genericMap: boolean) {
    this.debug('parse');
    this.expect('(');
    const ports: any[] = [];
    if (genericMap) {
      if (this.parent instanceof OSubprogram) {
        throw new Error('Subprogram cannot have generics');
      }
      this.parent.generics = ports;
    } else {
      if (this.parent instanceof OPackage) {
        throw new Error('Package can only have generics and no ports');
      }
      this.parent.ports = ports;
    }
    while (this.pos.i < this.text.length) {
      this.debug('parse i ' + this.pos.i);

      this.advanceWhitespace();

      let port = genericMap ?
        new OGeneric(this.parent, this.pos.i, this.getEndOfLineI()) :
        new OPort(this.parent, this.pos.i, this.getEndOfLineI());

      if (this.text[this.pos.i] === ')') {
        this.pos.i++;
        this.advanceWhitespace();
        break;
      }

      const nextWord = this.getNextWord({ consume: false }).toLowerCase();
      if (nextWord === 'type') {
        this.getNextWord();
        port.name = new OName(port, this.pos.i, this.pos.i);
        port.name.text = this.getNextWord();
        port.name.range.end.i = port.name.range.start.i + port.name.text.length;
        if (genericMap) {
          ports.push(port);
        } else {
          ports.push(port as any);
        }
        if (this.text[this.pos.i] === ';') {
          this.pos.i++;
          this.advanceWhitespace();
        }
      } else if (nextWord === 'procedure' || nextWord === 'impure' || nextWord === 'pure' || nextWord === 'function') {
        const subprogramParser = new SubprogramParser(this.text, this.pos, this.file, this.parent);
        this.parent.subprograms.push(subprogramParser.parse(this.pos.i));
      } else {
        let constant: boolean | undefined;
        if (nextWord === 'signal' || nextWord === 'variable' || nextWord === 'constant' || nextWord === 'file') {
          if (nextWord === 'constant') {
            constant = true;
          }
          this.getNextWord();
        }
        port.name = new OName(port, this.pos.i, this.pos.i);
        port.name.text = this.getNextWord();
        port.name.range.end.i = port.name.range.start.i + port.name.text.length;
        if (this.text[this.pos.i] === ',') {
          this.expect(',');
          continue;
        }
        this.expect(':');
        let directionString;
        if (port instanceof OPort) {
          directionString = this.getNextWord({ consume: false }).toLowerCase();
          if (directionString !== 'in' && directionString !== 'out' && directionString !== 'inout') {
            port.direction = constant ? 'in' : 'inout';
            port.directionRange = new OIRange(port, this.pos.i, this.pos.i);
          } else {
            port.direction = directionString;
            port.directionRange = new OIRange(port, this.pos.i, this.pos.i + directionString.length);
            this.getNextWord(); // consume direction
          }
        }
        const iBeforeType = this.pos.i;
        const { type, defaultValue, endI } = this.getTypeDefintion(port);
        port.range.end.i = endI;
        port.type = this.extractReads(port, type, iBeforeType);

        port.defaultValue = defaultValue;
        if (genericMap) {
          ports.push(port);
        } else {
          ports.push(port as any);
        }
      }
    }
    this.debug('parseEnd');

  }
}