import { OComponent, OEntity, OGeneric, OIRange, OPackage, OPort, OSubprogram, OGenericConstant, ParserError } from './objects';
import { ParserBase, ParserState } from './parser-base';
import { SubprogramParser } from './subprogram-parser';
import { InterfacePackageParser } from './interface-package-parser';
import { OLexerToken } from '../lexer';
import { TextEdit } from 'vscode-languageserver';
import { ExpressionParser } from './expression-parser';


export class InterfaceListParser extends ParserBase {
  constructor(state: ParserState, private parent: OEntity | OSubprogram | OPackage | OComponent) {
    super(state);
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
    while (this.state.pos.isValid()) {
      this.debug(`parse i ${this.state.pos.i}`);

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
        ports.push(new InterfacePackageParser(this.state, this.parent).parse());
        this.maybe(';');
        foundElements++;
      } else if (nextToken.getLText() === 'procedure' || nextToken.getLText() === 'impure' || nextToken.getLText() === 'pure' || nextToken.getLText() === 'function') {
        if (generics === false) {
          throw new ParserError('Port list may only contain signal interface declarations', nextToken.range);
        }
        const subprogramParser = new SubprogramParser(this.state, this.parent);
        this.parent.declarations.push(subprogramParser.parse());
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
              port.directionRange = new OIRange(port, this.state.pos.i, this.state.pos.i);
            } else {
              port.direction = directionString;
              port.directionRange = new OIRange(port, this.state.pos.i, this.state.pos.i + directionString.length);
              this.consumeToken(); // consume direction
            }
          }
          const { type, defaultValue } = this.getTypeDefinition(port);
          const end = defaultValue?.[defaultValue.length - 1]?.range.end ?? type[type.length - 1]?.range?.end ?? port.range.end;
          port.range = port.range.copyWithNewEnd(end);
          (port as OGenericConstant).typeReference = new ExpressionParser(this.state, port, type).parse();

          (port as OGenericConstant).defaultValue = defaultValue;
          for (const interface_ of multiInterface) {
            if (interface_ instanceof OPort) {
              interface_.direction = (port as OPort).direction;
              interface_.directionRange = (port as OPort).directionRange;
            }
            interface_.range = interface_.range.copyWithNewEnd(end);
            (interface_ as OGenericConstant).typeReference = (port as OGenericConstant).typeReference;
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
      this.state.messages.push({
        message: `Empty interface list is not allowed`,
        range: startToken.range.copyWithNewEnd(closingBracket.range),
        solution: {
          message: 'remove interface list',
          edits: [
            TextEdit.del(this.getToken(startOffset, true).range.copyWithNewEnd(endDel.range))
          ]
        }
      });
    }
    this.debug('parseEnd');

  }
  getTypeDefinition(parent: OGeneric | OPort) {
    this.debug('getTypeDefinition');
    const [type, last] = this.advanceParenthesisAware([')', ';', ':='], true, false);
    let defaultValue: OLexerToken[] = [];
    if (last.getLText() === ':=') {
      this.consumeToken();
      [defaultValue] = this.advanceParenthesisAware([')', ';'], true, false);
    }
    this.reverseWhitespace();
    this.advanceWhitespace();
    if (this.getToken().text === ';') {
      const startI = this.state.pos.i;
      this.consumeToken();
      if (this.getToken().text === ')') {
        const range = new OIRange(parent, startI, startI + 1);
        this.state.messages.push({
          message: `Unexpected ';' at end of interface list`,
          range,
          solution: {
            message: `Remove ';'`,
            edits: [TextEdit.del(range)]
          }
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
      defaultValue: new ExpressionParser(this.state, parent, defaultValue).parse(),
    };
  }
}