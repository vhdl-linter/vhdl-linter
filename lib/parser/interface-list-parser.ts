import { OComponent, OEntity, OGeneric, OIRange, OPackage, OPort, OSubprogram, OGenericConstant, ParserError } from './objects';
import { ParserBase } from './parser-base';
import { SubprogramParser } from './subprogram-parser';
import { ParserPosition } from './parser';
import { InterfacePackageParser } from './interface-package-parser';
import { OLexerToken } from '../lexer';
import { TextEdit } from 'vscode-languageserver';


export class InterfaceListParser extends ParserBase {
  constructor(pos: ParserPosition, file: string, private parent: OEntity | OSubprogram | OPackage | OComponent) {
    super(pos, file);
    this.debug('start');
  }
  // TODO: Interface list parser does not correctly recognize parameter
  // Currently only port and generics exists. parameter interface list gets handles as port which is wrong and leads to problems with more restrictive testing.
  // Checkers can be commented back in then.
  parse(generics: boolean) {
    let foundElements = 0;
    this.debug('parse');
    const startToken = this.expect('(');
    const ports: (OPort | OGeneric)[] = [];
    if (generics) {
      if (this.parent instanceof OSubprogram) {
        throw new ParserError('Subprogram cannot have generics', this.parent.range);
      }
      this.parent.generics = ports as OGeneric[];
    } else {
      if (this.parent instanceof OPackage) {
        throw new ParserError('Package instantiations can only have generics and no ports', this.parent.range);
      }
      this.parent.ports = ports as OPort[];
    }
    const multiInterface = [];
    while (this.pos.isValid()) {
      this.debug('parse i ' + this.pos.i);

      this.advanceWhitespace();
      if (this.getToken().text === ')') {
        this.consumeToken();
        break;
      }
      const nextToken = this.getToken();

      if (nextToken.getLText() === 'package') {
        // if (generics === false) {
        //   throw new ParserError('Port list may only contain signal interface declarations', nextToken.range);
        // }
        this.consumeToken(); // consume 'package'
        ports.push(new InterfacePackageParser(this.pos, this.filePath, this.parent).parse());
        this.maybe(';');
        foundElements++;
      } else if (nextToken.getLText() === 'procedure' || nextToken.getLText() === 'impure' || nextToken.getLText() === 'pure' || nextToken.getLText() === 'function') {
        if (generics === false) {
          throw new ParserError('Port list may only contain signal interface declarations', nextToken.range);
        }
        const subprogramParser = new SubprogramParser(this.pos, this.filePath, this.parent);
        this.parent.subprograms.push(subprogramParser.parse());
        this.maybe(';');
        foundElements++;
      } else {
        const port = generics ?
          new OGenericConstant(this.parent, this.getToken().range.copyExtendEndOfLine()) :
          new OPort(this.parent, this.getToken().range.copyExtendEndOfLine());

        if (nextToken.getLText() === 'type') {
          // if (generics === false) {
          //   throw new ParserError('Port list may only contain signal interface declarations', nextToken.range);
          // }
          this.consumeToken();
          port.lexerToken = this.consumeToken();
          ports.push(port);
          this.maybe(';');
          foundElements++;

        } else {
          // if (generics === false && (nextToken.getLText() === 'variable' || nextToken.getLText() === 'constant' || nextToken.getLText() === 'file')) {
          //   throw new ParserError('Port list may only contain signal interface declarations', nextToken.range);
          // }
          if (nextToken.getLText() === 'signal' || nextToken.getLText() === 'variable' || nextToken.getLText() === 'constant' || nextToken.getLText() === 'file') {
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
          (port as OGenericConstant).type = this.extractReads(port, type);

          (port as OGenericConstant).defaultValue = defaultValue;
          for (const interface_ of multiInterface) {
            if (interface_ instanceof OPort) {
              interface_.direction = (port as OPort).direction;
              interface_.directionRange = (port as OPort).directionRange;
            }
            interface_.range = interface_.range.copyWithNewEnd(end);
            (interface_ as OGenericConstant).type = (port as OGenericConstant).type;
            (interface_ as OGenericConstant).defaultValue = (port as OGenericConstant).defaultValue;
            ports.push(interface_);
            foundElements++;

          }
          ports.push(port);
          foundElements++;

          // clear multiInterface list to avoid duplicates
          multiInterface.splice(0, multiInterface.length);
        }
      }

    }
    if (foundElements === 0) {
      let startOffset = 0;
      while (this.getToken(startOffset, true) !== startToken) {
        startOffset--;
      }

      if (this.getToken(startOffset - 1, true).getLText() === 'port'
      || this.getToken(startOffset - 1, true).getLText() === 'generic'
      || this.getToken(startOffset - 1, true).getLText() === 'parameter') {
        startOffset--;
      }
      const closingBracket = this.getToken(-1, true);
      let endDel = closingBracket;
      if (this.getToken().getLText() === ';') {
        endDel = this.getToken();
      }
      throw new ParserError(`Empty interface list is not allowed`,
        startToken.range.copyWithNewEnd(closingBracket.range),
        {
          message: 'remove interface list',
          edits: [
            TextEdit.del(this.getToken(startOffset, true).range.copyWithNewEnd(endDel.range))
          ]
        }
      );
    }
    this.debug('parseEnd');

  }
  getTypeDefintion(parent: OGeneric | OPort) {
    this.debug('getTypeDefintion');
    const [type, last] = this.advanceParentheseAware([')', ';', ':='], true, false);
    let defaultValue: OLexerToken[] = [];
    if (last.getLText() === ':=') {
      this.consumeToken();
      [defaultValue] = this.advanceParentheseAware([')', ';'], true, false);
    }
    this.reverseWhitespace();
    this.advanceWhitespace();
    if (this.getToken().text === ';') {
      const startI = this.pos.i;
      this.consumeToken();
      if (this.getToken().text === ')') {
        const range = new OIRange(parent, startI, startI + 1).copyExtendBeginningOfLine();
        throw new ParserError(`Unexpected ';' at end of interface list`, range, {
          message: `Remove ';'`,
          edits: [TextEdit.del(new OIRange(parent, startI, startI + 1))]
        });
      }
    }
    if (defaultValue.length === 0) {
      return {
        type: type,

      };

    }
    return {
      type: type,
      defaultValue: this.extractReads(parent, defaultValue),
    };
  }
}