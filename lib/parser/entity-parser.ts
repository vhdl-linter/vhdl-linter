import { ParserBase } from './parser-base';
import { DeclarativePartParser } from './declarative-part-parser';
import { OPort, OGeneric, OEntity, ParserError, OFileWithEntity, OGenericActual, OGenericType, OI, OIRange, OName } from './objects';
import { runInThisContext } from 'vm';
import { TextEdit } from 'vscode-languageserver';
import { AssignmentParser } from './assignment-parser';
import { StatementParser, StatementTypes } from './statement-parser';

export class EntityParser extends ParserBase {
  public entity: OEntity;
  constructor(text: string, pos: OI, file: string, private parent: OFileWithEntity) {
    super(text, pos, file);
    const match = this.parent.originalText.match(/!\s*@library\s+(\S+)/i);
    const library = match ? match[1] : undefined;
    this.entity = new OEntity(this.parent, this.pos.i, this.getEndOfLineI(), library);
    this.debug(`start`);
  }
  parse(): OEntity {
    this.entity.name = this.getNextWord();
    this.expect('is');

    let lastI;
    while (this.pos.i < this.text.length) {
      if (this.text[this.pos.i].match(/\s/)) {
        this.pos.i++;
        continue;
      }
      let nextWord = this.getNextWord({ consume: false }).toLowerCase();
      const savedI = this.pos.i;
      if (nextWord === 'port') {
        this.getNextWord();
        this.parsePortsAndGenerics(false, this.entity);
        this.entity.portRange = new OIRange(this.entity, savedI, this.pos.i);
      } else if (nextWord === 'generic') {
        this.getNextWord();
        this.parsePortsAndGenerics(true, this.entity);
        this.entity.genericRange = new OIRange(this.entity, savedI, this.pos.i);
      } else if (nextWord === 'end') {
        this.getNextWord();
        this.maybeWord('entity');
        this.maybeWord(this.entity.name);
        this.expect(';');
        break;
      } else if (nextWord === 'begin') {
        this.getNextWord();
        let nextWord = this.getNextWord({consume: false}).toLowerCase();
        while (nextWord !== 'end') {
          new StatementParser(this.text, this.pos, this.file, this.entity).parse([
            StatementTypes.Assert,
            StatementTypes.ProcedureInstantiation,
            StatementTypes.Process
          ]);
          nextWord = this.getNextWord({ consume: false }).toLowerCase();
        }
        this.getNextWord();
        this.maybeWord('entity');
        this.maybeWord(this.entity.name);
        this.expect(';');
        break;

      } else {
        new DeclarativePartParser(this.text, this.pos, this.file, this.entity).parse(true);
      }
      if (lastI === this.pos.i) {
        throw new ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos.getRangeToEndLine());
      }
      lastI = this.pos.i;
    }
    this.entity.range.end.i = this.pos.i;

    return this.entity;
  }
  parsePortsAndGenerics(generics: false, entity: any): void;
  parsePortsAndGenerics(generics: true, entity: any): void;
  parsePortsAndGenerics(generics: false | true, entity: any) {
    this.debug('start ports');
    this.expect('(');
    // let multiPorts: string[] = [];
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
        port.name = new OName(port, this.pos.i, this.pos.i);
        port.name.text = this.getNextWord();
        port.name.range.end.i = port.name.range.start.i + port.name.text.length;
        if (generics) {
          this.entity.generics.push(port);
        } else {
          this.entity.ports.push(port as any);
        }
        if (this.text[this.pos.i] === ';') {
          this.pos.i++;
          this.advanceWhitespace();
        }
      } else {
        port.name = new OName(port, this.pos.i, this.pos.i);
        port.name.text = this.getNextWord();
        port.name.range.end.i = port.name.range.start.i + port.name.text.length;
        if (this.text[this.pos.i] === ',') {
          this.expect(',');
          // multiPorts.push(port.name);
          continue;
        }
        this.expect(':');
        let directionString;
        if (port instanceof OPort) {
          directionString = this.getNextWord({ consume: false });
          if (directionString !== 'in' && directionString !== 'out' && directionString !== 'inout') {
            port.direction = 'inout';
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
        // port.type = type;
        port.type = this.extractReads(port, type, iBeforeType);

        port.defaultValue = defaultValue;
        if (generics) {
          this.entity.generics.push(port);
        } else {
          this.entity.ports.push(port as any);
        }
        // for (const multiPortName of multiPorts) {
        //   const multiPort = new OPort(this.parent, -1);
        //   Object.assign(port, multiPort);
        //   multiPort.name = multiPortName;
        //   ports.push(multiPort);
        // }
        // multiPorts = [];
      }
    }
  }
  getTypeDefintion(parent: OGenericActual | OPort) {
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
    const startI = this.pos.i + 2;
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
    this.reverseWhitespace();
    const endI = this.pos.i;
    this.advanceWhitespace();
    if (this.text[this.pos.i] === ';') {
      const startI = this.pos.i;
      this.pos.i++;
      this.advanceWhitespace();
      if (this.text[this.pos.i] === ')') {
        const range = new OIRange(parent, startI, startI + 1);
        range.start.character = 0;
        throw new ParserError(`Unexpected ';' at end of port list`, range, {
          message: `Remove ';'`,
          edits: [TextEdit.del(new OIRange(parent, startI, startI + 1))]
        });
      }
    }
    defaultValue = defaultValue.trim();
    if (defaultValue === '') {
      return {
        type: type.trim(),
        endI
      };

    }
    return {
      type: type.trim(),
      defaultValue: this.extractReads(parent, defaultValue, startI),
      endI
    };
  }
}
