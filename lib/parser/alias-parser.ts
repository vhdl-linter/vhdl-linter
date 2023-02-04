import { ExpressionParser } from "./expression-parser";
import { OAlias, OAliasWithSignature, ObjectBase, OEntity, OIRange, OPackage, OPackageBody, OProcess, OReference, OSelectedName, OStatementBody, OSubprogram, OType, OTypeMark, SelectedNamePrefix } from "./objects";
import { ParserBase, ParserState } from "./parser-base";
export class AliasParser extends ParserBase {
  constructor(state: ParserState, private parent: OStatementBody | OEntity | OPackage | OPackageBody | OProcess | OSubprogram | OType) {
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
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.getToken().getLText() !== 'return') {
        aliasWithSignature.typeMarks.push(new OTypeMark(aliasWithSignature, this.consumeNameReference(aliasWithSignature)));
      } else {
        this.expect('return');
        aliasWithSignature.return = this.consumeNameReference(aliasWithSignature);
      }
      if (this.getToken().getLText() === ',') {
        this.expect(',');
      } else if (this.getToken().getLText() === 'return') {
        this.expect('return');
        aliasWithSignature.typeMarks.push(new OTypeMark(aliasWithSignature, this.consumeNameReference(aliasWithSignature)));
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
  consumeNameReference(parent: ObjectBase): OReference {
    const tokens = [];
    do {
      tokens.push(this.consumeToken());
    } while (this.getToken().text === '.' && this.consumeToken());
    if (tokens.length > 1) {
      const prefix = [new OReference(parent, tokens[0])];
      for (const token of tokens.slice(1)) {
        prefix.push(new OSelectedName(parent, token, prefix.slice() as SelectedNamePrefix));
      }
      return prefix[prefix.length - 1];
    }
    return new OReference(parent, tokens[0]);
  }
}