import { OComponent, OEntity, OGeneric, OIRange, OPackage, OPort, OSubprogram, implementsIHasPackageInstantiations } from './objects';
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
    const ports: (OPort|OGeneric)[] = [];
    if (generics) {
      if (this.parent instanceof OSubprogram) {
        throw new Error('Subprogram cannot have generics');
      }
      this.parent.generics = ports as OGeneric[];
    } else {
      if (this.parent instanceof OPackage) {
        throw new Error('Package instantiations can only have generics and no ports');
      }
      this.parent.ports = ports as OPort[];
    }
    const multiInterface = [];
    while (this.pos.isValid()) {
      this.debug('parse i ' + this.pos.i);

      this.advanceWhitespace();

      const port = generics ?
        new OGeneric(this.parent, this.getToken().range.copyExtendEndOfLine()) :
        new OPort(this.parent, this.getToken().range.copyExtendEndOfLine());

      if (this.getToken().text === ')') {
        this.consumeToken();
        break;
      }

      const nextWord = this.getToken();
      if (nextWord.getLText() === 'type') {
        this.consumeToken();
        port.lexerToken = this.consumeToken();
        ports.push(port);
        this.maybeWord(';');
      } else if (nextWord.getLText() === 'procedure' || nextWord.getLText() === 'impure' || nextWord.getLText() === 'pure' || nextWord.getLText() === 'function') {
        const subprogramParser = new SubprogramParser(this.pos, this.filePath, this.parent);
        this.parent.subprograms.push(subprogramParser.parse());
        this.maybeWord(';');
      } else if (nextWord.getLText() === 'package') {
        if (implementsIHasPackageInstantiations(this.parent)) {
          this.consumeToken(); // consume 'package'
          this.parent.packageInstantiations.push(new PackageInstantiationParser(this.pos, this.filePath, this.parent).parse());
        } else {
          this.advanceBraceAwareToken([';', ')'], true, false);
        }
        this.maybeWord(';');
      } else {
        if (nextWord.getLText() === 'signal' || nextWord.getLText() === 'variable' || nextWord.getLText() === 'constant' || nextWord.getLText() === 'file') {
          this.consumeToken();
        }
        port.lexerToken = this.consumeToken();
        if (this.getToken().getLText() === ',') {
          this.expect(',');
          multiInterface.push(port);
          continue;
        }
        this.expect(':');
        let directionString;
        if (port instanceof OPort) {
          directionString = this.getToken().getLText();
          if (directionString !== 'in' && directionString !== 'out' && directionString !== 'inout') {
            port.direction = 'in';
            port.directionRange = new OIRange(port, this.pos.i, this.pos.i);
          } else {
            port.direction = directionString;
            port.directionRange = new OIRange(port, this.pos.i, this.pos.i + directionString.length);
            this.consumeToken(); // consume direction
          }
        }
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
          ports.push(interface_);
        }
        ports.push(port);
        // clear multiInterface list to avoid duplicates
        multiInterface.splice(0, multiInterface.length);
      }
    }
    this.debug('parseEnd');

  }
}