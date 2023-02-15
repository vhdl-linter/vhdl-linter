import { DiagnosticSeverity, TextEdit } from "vscode-languageserver";
import { OLexerToken } from "../lexer";
import { ExpressionParser } from "./expression-parser";
import { OAttributeDeclaration, OAttributeSpecification, ObjectBase, OReference, ParserError } from "./objects";
import { ParserBase, ParserState } from "./parser-base";

export class AttributeParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase) {
    super(state);
    this.debug(`start`);

  }
  parse() {
    const attribute = this.expect('attribute');
    const token = this.consumeToken();
    if (this.getToken().getLText() === 'of') {
      return this.parseAttributeSpecification(token, attribute);
    } else if (this.getToken().getLText() === ':') {
      return this.parseAttributeDeclaration(token, attribute);
    } else {
      throw new ParserError(`Unexpected token ${this.getToken().text} in AttributeParser (was expecting 'of' or ':')`, this.getToken().range);
    }
  }
  parseAttributeDeclaration(identifier: OLexerToken, attribute: OLexerToken) {
    this.expect(':');
    const [tokens, semicolon] = this.advanceParenthesisAware([';'], true, true);
    const attributeDeclaration = new OAttributeDeclaration(this.parent, attribute.range.copyWithNewEnd(tokens[tokens.length - 1]?.range ?? identifier.range));
    attributeDeclaration.lexerToken = identifier;
    if (tokens.length === 0) {
      this.state.messages.push({
        message: 'type_mark expected for attribute_declaration',
        range: semicolon.range,
        severity: DiagnosticSeverity.Error
      });
    } else {
      attributeDeclaration.typeReferences = new ExpressionParser(this.state, attributeDeclaration, tokens).parse();
    }

    return attributeDeclaration;
  }
  static readonly EntityClasses = ['entity', 'architecture', 'configuration', 'procedure', 'function', 'package', 'type',
    'subtype', 'constant', 'signal', 'variable', 'component', 'label', 'literal', 'units', 'group',
    'file', 'property', 'sequence',];
  parseAttributeSpecification(designator: OLexerToken, attribute: OLexerToken) {
    this.expect('of');
    const unexpectedDelimiter = [';', 'begin', ...AttributeParser.EntityClasses];
    const [tokens, endToken] = this.advanceParenthesisAware([':', ...unexpectedDelimiter], true, false);
    if (tokens.length === 0) {
      this.state.messages.push({
        message: `entity_name_list for attribute_specification may not be empty!`,
        range: endToken.range.copyWithNewEnd(endToken.range.start)
      });
    }
    if (unexpectedDelimiter.includes(endToken.getLText())) {
      this.state.messages.push({
        message: `Unexpected ${endToken.text} in attribute_specification. Assuming forgotten ':'`,
        range: endToken.range,
        solution: {
          message: "Insert ':'",
          edits: [
            TextEdit.insert(this.getToken(-1, true).range.end, ':')
          ]
        }
      });

    } else {
      this.consumeToken();
    }
    const attributeSpecification = new OAttributeSpecification(this.parent, attribute.range);
    attributeSpecification.lexerToken = designator;
    if (tokens.length === 1 && (tokens[0]!.getLText() === 'others' || tokens[0]!.getLText() === 'all')) {
      attributeSpecification.references = [];
    } else {
      for (let i = 0; i < tokens.length; i++) {
        attributeSpecification.references.push(new OReference(attributeSpecification, tokens[i]!));
        // This is a signature. Currently not completely handled
        if (tokens[i]?.getLText() === '[') {
          while (tokens[i]?.getLText() !== ']') {
            i++;
            if (i >= tokens.length) {
              throw new ParserError(`Did not find end of signature in attribute specification ']'`, tokens[tokens.length - 1]!.range);
            }
          }
        }
      }
    }

    attributeSpecification.entityClass = this.expect(AttributeParser.EntityClasses);
    this.expect('is');
    const [expressionTokens, semicolon] = this.advanceParenthesisAware([';'], true, true);
    attributeSpecification.references.push(...new ExpressionParser(this.state, attributeSpecification, expressionTokens).parse());
    attributeSpecification.range = attributeSpecification.range.copyWithNewEnd(semicolon.range);
    return attributeSpecification;
  }

}
