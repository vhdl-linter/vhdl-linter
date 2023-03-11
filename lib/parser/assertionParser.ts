import { OLexerToken } from "../lexer";
import { ExpressionParser } from "./expressionParser";
import * as I from "./interfaces";
import * as O from "./objects";
import { ParserBase, ParserState } from "./parserBase";
export class AssertionParser extends ParserBase {
  constructor(state: ParserState, private parent: O.ObjectBase & I.IHasStatements) {
    super(state);
    this.debug('start');
  }
  parse(label?: OLexerToken, postponed = false) {
    const assertion = new O.OAssertion(this.parent, this.getToken().range.copyExtendEndOfLine());
    assertion.postponed = postponed;
    this.expect('assert');
    assertion.label = label;

    assertion.name = [];
    let assertionTokens = this.advanceSemicolon();
    assertion.range = assertion.range.copyWithNewEnd(this.state.pos.i);
    const reportIndex = assertionTokens.findIndex(token => token.getLText() === 'report');
    if (reportIndex > -1) {
      assertion.name.push(...new ExpressionParser(this.state, assertion, assertionTokens.slice(0, reportIndex)).parse());
      assertionTokens = assertionTokens.slice(reportIndex + 1);
    }
    const severityIndex = assertionTokens.findIndex(token => token.getLText() === 'severity');
    if (severityIndex > -1) {
      assertion.name.push(...new ExpressionParser(this.state, assertion, assertionTokens.slice(0, severityIndex)).parse());
      assertionTokens = assertionTokens.slice(severityIndex + 1);
    }
    assertion.name.push(...new ExpressionParser(this.state, assertion, assertionTokens).parse());
    return assertion;
  }
}