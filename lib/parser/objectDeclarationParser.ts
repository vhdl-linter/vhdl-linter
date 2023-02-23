import { TextEdit } from 'vscode-languageserver';
import { OLexerToken } from '../lexer';
import { ExpressionParser } from './expressionParser';
import { IHasDeclarations } from './interfaces';
import { ObjectBase, OConstant, OFileVariable, ORead, OSignal, OVariable } from './objects';
import { ParserBase, ParserState } from './parserBase';

export class ObjectDeclarationParser extends ParserBase {

  constructor(state: ParserState, private parent: ObjectBase & IHasDeclarations) {
    super(state);
    this.debug('start');
  }
  parse(nextToken: OLexerToken) {
    let shared = false;
    if (nextToken.getLText() === 'shared') {
      shared = true;
      this.consumeToken();
      nextToken = this.getToken();
    }
    const objects = [];
    const constant = nextToken.getLText() === 'constant';
    const variable = nextToken.getLText() === 'variable';
    const file = nextToken.getLText() === 'file';
    // TODO: Implement checking for supported declaration type.

    this.consumeToken();
    do {
      this.maybe(',');
      let object;
      if (variable) {
        object = new OVariable(this.parent , nextToken.range);
        object.shared = shared;
      } else if (constant) {
        object = new OConstant(this.parent , nextToken.range);
      } else if (file) {
        object = new OFileVariable(this.parent, nextToken.range);
      } else {
        object = new OSignal(this.parent, nextToken.range);
      }
      object.lexerToken = this.consumeToken();
      objects.push(object);

    } while (this.getToken().getLText() === ',');
    this.expect(':');

    if (file) {
      const typeToken = this.consumeToken();
      for (const file of objects.slice(objects.length - 1) as OFileVariable[]) {
        const typeRead = new ORead(file, typeToken);
        file.typeReference = [typeRead];
        let tokens, endToken;
        if (this.maybe('open')) {
          [tokens, endToken] = this.advanceParenthesisAware(['is', ';', ...this.NotExpectedDelimiter], true, false);
          file.openKind = new ExpressionParser(this.state, file, tokens).parse();
        }
        if (this.maybe('is')) {
          [tokens, endToken] = this.advanceParenthesisAware([';', ...this.NotExpectedDelimiter], true, false);
          file.logicalName = new ExpressionParser(this.state, file, tokens).parse();
        }
        if (!endToken) {
          endToken = this.getToken();
        }
        if (this.NotExpectedDelimiter.includes(endToken.getLText())) {
          this.state.messages.push({
            message: `Unexpected ${endToken.text} in object declaration. Assuming forgotten ';'`,
            range: endToken.range,
            solution: {
              message: `Insert ';'`,
              edits: [
                TextEdit.insert(this.getToken(-1, true).range.end, ';')
              ]
            }
          });
        } else {
          this.expect(';');
        }
        // TODO: Parse optional parts of file definition
      }
    } else {
      // If multiple types have the same type reference (variable a,b : integer) only the last has the text.
      for (const signal of objects.slice(objects.length - 1)) {
        const { typeReads, defaultValueReads } = this.getType(signal);
        signal.typeReference = typeReads;
        signal.defaultValue = defaultValueReads;
      }

    }
    for (const object of objects) {
      object.range = object.range.copyWithNewEnd(this.getToken(-1, true).range.end);
    }
    if (constant) {
      this.parent.declarations.push(...objects);
    } else if (variable) {
      this.parent.declarations.push(...objects);
    } else if (file) {
      this.parent.declarations.push(...objects);
    } else {
      this.parent.declarations.push(...objects);
    }
  }
  readonly NotExpectedDelimiter = ['end', 'file', 'constant', 'variable', 'begin', 'signal', 'is'];
  getType(parent: ObjectBase) {
    const [type, endToken] = this.advanceParenthesisAware([';', ...this.NotExpectedDelimiter], true, false);
    if (this.NotExpectedDelimiter.includes(endToken.getLText())) {

      this.state.messages.push({
        message: `Unexpected ${endToken.text} in object declaration. Assuming forgotten ';'`,
        range: endToken.range,
        solution: {
          message: `Insert ';'`,
          edits: [
            TextEdit.insert(this.getToken(-1, true).range.end, ';')
          ]
        }
      });
    } else {
      this.expect(';');
    }
    let defaultValueReads;
    let typeReads;
    const index = type.findIndex(token => token.getLText() === ':=');
    if (index > -1) {
      const tokensDefaultValue = type.slice(index + 1);
      const typeTokens = type.slice(0, index);

      defaultValueReads = new ExpressionParser(this.state, parent, tokensDefaultValue).parse();
      typeReads = new ExpressionParser(this.state, parent, typeTokens).parse();
    } else {
      typeReads = new ExpressionParser(this.state, parent, type).parse();

    }

    return {
      typeReads,
      defaultValueReads
    };
  }
}