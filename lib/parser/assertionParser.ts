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
  parse(label?: OLexerToken) {
    const assertion = new O.OAssertion(this.parent, this.getToken().range.copyExtendEndOfLine());
    const postponedToken = this.maybe('postponed');
    assertion.postponed = postponedToken !== undefined;
    if (postponedToken && this.parent instanceof O.OStatementBody === false) {
      this.state.messages.push({
        range: postponedToken.range,
        message: 'postponed only allowed in concurrent statement'
      });
    }
    this.expect('assert');
    assertion.label = label;

    assertion.references = [];
    let assertionTokens = this.advanceSemicolon();
    assertion.range = assertion.range.copyWithNewEnd(this.state.pos.i);
    const reportIndex = assertionTokens.findIndex(token => token.getLText() === 'report');
    if (reportIndex > -1) {
      assertion.references.push(...new ExpressionParser(this.state, assertion, assertionTokens.slice(0, reportIndex)).parse());
      assertionTokens = assertionTokens.slice(reportIndex + 1);
    }
    const severityIndex = assertionTokens.findIndex(token => token.getLText() === 'severity');
    if (severityIndex > -1) {
      assertion.references.push(...new ExpressionParser(this.state, assertion, assertionTokens.slice(0, severityIndex)).parse());
      assertionTokens = assertionTokens.slice(severityIndex + 1);
    }
    assertion.references.push(...new ExpressionParser(this.state, assertion, assertionTokens).parse());
    return assertion;
  }
}