import { DiagnosticSeverity } from "vscode-languageserver";
import { OLexerToken, TokenType } from "../lexer";
import { ExpressionParser } from "./expressionParser";
import * as I from "./interfaces";
import * as O from "./objects";
import { ParserBase, ParserState } from "./parserBase";

export class SubtypeIndicationParser extends ParserBase {

  constructor(state: ParserState, private parent: O.ObjectBase & I.IHasSubtypeIndication) {
    super(state);
    this.debug('start');
  }

  parse(notExpectedDelimiter?: string[]): O.OSubtypeIndication {
    const startToken = this.getToken();
    const endTokens = ['register', 'bus', ';', ':', ')', 'is', ...notExpectedDelimiter ?? []];
    let buckets: OLexerToken[][] = [];
    let currentBucket: OLexerToken[] = [];
    // Find parts of the subtype indication
    // In general identifiers can not follow each other inside of one thing.
    // So, two successive identifiers mean the next part of the definition starts.
    // Those parts are split into buckets here and mapped to the LRM definition afterwards.
    // Stuff in brackets is same bucket always.
    while (endTokens.includes(this.getToken().getLText()) === false) {
      if (this.getToken().getLText() === '(') {
        currentBucket = [this.consumeToken()];
        const [tokens, closing] = this.advanceParenthesisAware([')'], true, true);
        tokens.push(closing);
        currentBucket.push(...tokens);
        buckets.push(currentBucket);
      } else if (this.getToken().getLText() === 'range') {
        currentBucket = [this.consumeToken()];
        const [tokens] = this.advanceParenthesisAware(endTokens, true, false);
        currentBucket.push(...tokens);
        buckets.push(currentBucket);
        break;
      } else {
        currentBucket = [];
        do {
          currentBucket.push(this.consumeToken());
        } while ((this.getToken().isIdentifier() || this.getToken().type === TokenType.keyword) && ((this.getToken(-1, true).isIdentifier() === false && this.getToken(-1, true).type !== TokenType.keyword))
        || this.getToken().getLText() === '.'
          || this.getToken().getLText() === '\'');
        buckets.push(currentBucket);

      }
    }
    if (buckets.length > 3) {
      buckets = [
        buckets[0]!,
        buckets[1]!,
        buckets.slice(2).flat()
      ];
    }
    const subtypeIndication = new O.OSubtypeIndication(this.parent, startToken.range.copyWithNewEnd(this.getToken(-1, true).range));
    if (buckets.length === 1) {
      if (buckets[0]!.length === 0) {
        this.state.messages.push({
          message: 'subtype indication expected',
          range: subtypeIndication.range,
          severity: DiagnosticSeverity.Error
        });
      } else {
        subtypeIndication.typeNames = new ExpressionParser(this.state, subtypeIndication, buckets[0]!).parse();

      }
    } else if (buckets.length === 2) {
      // TODO: Find a more reliable way to determine which optional is set
      // With two buckets it can now be resolutionIndication + type or type + constraint.
      if (buckets[1]!.find(token => token.getLText() === 'range' || token.getLText() === 'downto' || token.getLText() === 'to')) {
        subtypeIndication.typeNames = new ExpressionParser(this.state, subtypeIndication, buckets[0]!).parse();
        subtypeIndication.constraint = new ExpressionParser(this.state, subtypeIndication, buckets[1]!).parseConstraint();
      } else {
        subtypeIndication.resolutionIndication = new ExpressionParser(this.state, subtypeIndication, buckets[0]!).parse();
        subtypeIndication.typeNames = new ExpressionParser(this.state, subtypeIndication, buckets[1]!).parse();
      }

    } else if (buckets.length === 3) {
      if (buckets[1]![0]?.getLText() === '(') {
        subtypeIndication.typeNames = new ExpressionParser(this.state, subtypeIndication, buckets[0]!).parse();
        subtypeIndication.constraint = new ExpressionParser(this.state, subtypeIndication, buckets.slice(1).flat()).parseConstraint();
      } else {
        subtypeIndication.resolutionIndication = new ExpressionParser(this.state, subtypeIndication, buckets[0]!).parse();
        subtypeIndication.typeNames = new ExpressionParser(this.state, subtypeIndication, buckets[1]!).parse();
        subtypeIndication.constraint = new ExpressionParser(this.state, subtypeIndication, buckets[2]!).parseConstraint()
      }
    } else {
      throw new O.ParserError(`Error while parsing subtype indication. Was expecting 1 - 3 buckets found ${buckets.length}`, subtypeIndication.range);
    }
    return subtypeIndication;
  }
}