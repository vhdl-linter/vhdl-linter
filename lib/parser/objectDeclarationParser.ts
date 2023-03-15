import { TextEdit } from 'vscode-languageserver';
import { OLexerToken } from '../lexer';
import { ExpressionParser } from './expressionParser';
import { IHasDeclarations, IHasSubtypeIndication } from './interfaces';
import { ObjectBase, OConstant, OFileVariable, OName, OSignal, OVariable } from './objects';
import { ParserBase, ParserState } from './parserBase';
import { SubtypeIndicationParser } from './subtypeIndicationParser';

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
        object = new OVariable(this.parent, nextToken.range);
        object.shared = shared;
      } else if (constant) {
        object = new OConstant(this.parent, nextToken.range);
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
      const subtypeIndication = new SubtypeIndicationParser(this.state, objects[0]!).parse(['open', ...this.NotExpectedDelimiter]);
      for (const file of objects.slice(objects.length - 1) as OFileVariable[]) {
        file.subtypeIndication = subtypeIndication;
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
      const { subtypeIndication, defaultValueReads } = this.getType(objects[objects.length - 1]!);
      for (const object of objects) {
        object.subtypeIndication = subtypeIndication;
        object.defaultValue = defaultValueReads;
      }

    }
    for (const object of objects) {
      object.range = object.range.copyWithNewEnd(this.getToken(-1, true).range.end);
    }
    return objects;
  }
  readonly NotExpectedDelimiter = ['end', 'file', 'constant', 'variable', 'begin', 'signal', 'is'];
  getType(parent: ObjectBase & IHasSubtypeIndication) {
    const subtypeIndication = new SubtypeIndicationParser(this.state, parent).parse([...this.NotExpectedDelimiter, ':=']);
    let defaultValueReads: OName[] | undefined;
    if (this.getToken().getLText() === ':=') {
      this.consumeToken();
      const [tokensDefaultValue] = this.advanceParenthesisAware([';', ...this.NotExpectedDelimiter], true, false);
      defaultValueReads = new ExpressionParser(this.state, parent, tokensDefaultValue).parse();
    }
    if (this.NotExpectedDelimiter.includes(this.getToken().getLText())) {
      this.state.messages.push({
        message: `Unexpected ${this.getToken().text} in object declaration. Assuming forgotten ';'`,
        range: this.getToken().range,
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


    return {
      subtypeIndication,
      defaultValueReads
    };
  }
}