import { implementsIHasPackageInstantiations, OComponent, OEntity, OGeneric, OI, OIRange, OName, OPackage, OPort, OSubprogram } from './objects';
import { ParserBase } from './parser-base';
import { SubprogramParser } from './subprogram-parser';
import { ParserPosition } from './parser';
import { PackageInstantiationParser } from './package-instantiation-parser';


export class InterfaceListParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: OEntity | OSubprogram | OPackage | OComponent) {
    super(pos, file);
    this.debug('start');
  }

  parse(generics: boolean) {
    this.debug('parse');
    this.expect('(');
    const ports: any[] = [];
    if (generics) {
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
    let multiInterface = [];
    while (this.pos.isValid()) {
      this.debug('parse i ' + this.pos.i);

      this.advanceWhitespace();

      let port = generics ?
        new OGeneric(this.parent, this.getToken().range.copyExtendEndOfLine()) :
        new OPort(this.parent, this.getToken().range.copyExtendEndOfLine());

      if (this.getToken().text === ')') {
        this.consumeToken();
        break;
      }

      const nextWord = this.getNextWord({ consume: false }).toLowerCase();
      if (nextWord === 'type') {
        this.getNextWord();
        const name = this.consumeToken();
        port.name = new OName(port, name.range);
        port.name.text = name.text;
        if (generics) {
          ports.push(port);
        } else {
          ports.push(port as any);
        }
        this.maybeWord(';');
      } else if (nextWord === 'procedure' || nextWord === 'impure' || nextWord === 'pure' || nextWord === 'function') {
        const subprogramParser = new SubprogramParser(this.pos, this.filePath, this.parent);
        this.parent.subprograms.push(subprogramParser.parse(this.pos.i));
        this.maybeWord(';');
      } else if (nextWord === 'package') { // TODO: Handle correctly
        if (implementsIHasPackageInstantiations(this.parent)) {
          this.parent.packageInstantiations.push(new PackageInstantiationParser(this.pos, this.filePath, this.parent).parse());
        } else {
          this.advanceBraceAwareToken([';', ')'], true, false);
        }
        this.maybeWord(';');
      } else {
        if (nextWord === 'signal' || nextWord === 'variable' || nextWord === 'constant' || nextWord === 'file') {
          this.getNextWord();
        }
        const name = this.consumeToken();
        port.name = new OName(port, name.range);
        port.name.text = name.text;
        if (this.getToken().getLText() === ',') {
          this.expect(',');
          multiInterface.push(port);
          continue;
        }
        this.expect(':');
        let directionString;
        if (port instanceof OPort) {
          directionString = this.getNextWord({ consume: false }).toLowerCase();
          if (directionString !== 'in' && directionString !== 'out' && directionString !== 'inout') {
            port.direction = 'in';
            port.directionRange = new OIRange(port, this.pos.i, this.pos.i);
          } else {
            port.direction = directionString;
            port.directionRange = new OIRange(port, this.pos.i, this.pos.i + directionString.length);
          }
          this.getNextWord(); // consume direction
        }
        const iBeforeType = this.pos.i;
        const { type, defaultValue } = this.getTypeDefintion(port);
        const end = defaultValue?.[defaultValue?.length - 1]?.range.end ?? type[type.length - 1]?.range?.end ?? port.range.end;
        port.range = port.range.copyWithNewEnd(end);
        port.type = this.extractReads(port, type);

        port.defaultValue = defaultValue;
        for (const interface_ of multiInterface) {
          if (interface_ instanceof OPort) {
            interface_.direction = (port as OPort).direction;
            interface_.directionRange = (port as OPort).directionRange;
          }
          interface_.range = interface_.range.copyWithNewEnd(end);
          interface_.type = port.type;
          interface_.defaultValue = port.defaultValue;
          if (generics) {
            ports.push(interface_);
          } else {
            ports.push(interface_ as any);
          }
        }
        if (generics) {
          ports.push(port);
        } else {
          ports.push(port as any);
        }
      }
    }
    this.debug('parseEnd');

  }
}