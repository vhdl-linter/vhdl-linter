import { ExpressionParser } from "./expressionParser";
import { IHasDeclarations } from "./interfaces";
import { OAlias, OAliasWithSignature, ObjectBase, OIRange, OTypeMark } from "./objects";
import { ParserBase, ParserState } from "./parserBase";
export class AliasParser extends ParserBase {
  constructor(state: ParserState, private parent: ObjectBase & IHasDeclarations) {
    super(state);
    this.debug('start');
  }
  parse() {
    const startRange = this.consumeToken().range;
    let i = 0;
    let foundSignature = false;
    while (this.getToken(i).getLText() !== ';') {
      if (this.getToken(i).getLText() === '[') {
        foundSignature = true;
        break;
      }
      i++;
    }
    if (foundSignature) {
      return this.parseAliasWithSignature(startRange);
    }
    return this.parseAlias(startRange);
  }

  parseAliasWithSignature(startRange: OIRange) {
    const aliasWithSignature = new OAliasWithSignature(this.parent, startRange);
    aliasWithSignature.lexerToken = this.consumeToken();
    if (this.getToken().getLText() === ':') {
      this.consumeToken();
      this.advanceWhitespace();
      const [tokens] = this.advanceParenthesisAware([';', 'is'], true, false);

      aliasWithSignature.subtypeIndication.push(...new ExpressionParser(this.state, aliasWithSignature, tokens).parse());
    }
    this.expect('is');
    const [tokens] = this.advanceParenthesisAware(['['], true, false);
    aliasWithSignature.name.push(...new ExpressionParser(this.state, aliasWithSignature, tokens).parse());

    this.expect('[');
    // eslint-disable-next-line no-constant-condition, @typescript-eslint/no-unnecessary-condition
    while (true) {
      if (this.getToken().getLText() !== 'return') {
        const typeReferences = this.advanceSelectedName(aliasWithSignature);
        aliasWithSignature.typeMarks.push(new OTypeMark(aliasWithSignature, typeReferences[typeReferences.length - 1]!));
      } else {
        this.expect('return');
        const typeReferences = this.advanceSelectedName(aliasWithSignature);
        aliasWithSignature.return = typeReferences[typeReferences.length - 1]!;
      }
      if (this.getToken().getLText() === ',') {
        this.expect(',');
      } else if (this.getToken().getLText() === 'return') {
        this.expect('return');
        const typeReferences = this.advanceSelectedName(aliasWithSignature);
        aliasWithSignature.typeMarks.push(new OTypeMark(aliasWithSignature, typeReferences[typeReferences.length - 1]!));
        this.expect(']');
        break;
      } else {
        this.expect(']');
        break;
      }
    }
    aliasWithSignature.range = aliasWithSignature.range.copyWithNewEnd(this.getToken().range);
    this.expect(';');
    return aliasWithSignature;
  }
  parseAlias(startRange: OIRange) {
    const alias = new OAlias(this.parent, startRange);

    alias.lexerToken = this.consumeToken();
    if (this.getToken().getLText() === ':') {
      this.consumeToken();
      this.advanceWhitespace();
      const [tokens] = this.advanceParenthesisAware([';', 'is'], true, false);

      alias.subtypeIndication.push(...new ExpressionParser(this.state, alias, tokens).parse());
    }
    const isToken = this.expect('is');
    const [tokens, semicolon] = this.advanceParenthesisAware([';'], true, true);
    if (tokens.length === 0) {
      this.state.messages.push({
        range: isToken.range.copyWithNewEnd(semicolon.range),
        message: `Expected name for alias. None found.`
      });
    } else {
      alias.name.push(...new ExpressionParser(this.state, alias, tokens).parse());
    }
    alias.range = alias.range.copyWithNewEnd(semicolon.range);
    return alias;
  }
}