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
    const buckets: OLexerToken[][] = [];
    let currentBucket: OLexerToken[] = [];
    let lastToken: OLexerToken | undefined;
    const breakTokens = [',', '=>',
      'to', 'downto', // range constraints
      '*', '/', 'mod', 'rem', // term
      'abs', 'not', '**', // factor
      'and', 'or', 'xor', 'nand', 'nor', 'xnor', //logical expression
      "=", "/=", "<", "<=", ">", ">=", "?=", "?/=", "?<", "?<=", "?>", "?>=", //relation
      "sll", "srl", "sla", "sra", "rol", "ror", //shiftExpression
      "+", "-", "&", //adding_operator
      "*", "/", "mod", "rem", //multiplying_operator
    ];
    while (endTokens.includes(this.getToken().getLText()) === false) {
      if ((this.getToken().isIdentifier() || this.getToken().type === TokenType.keyword) && breakTokens.includes(this.getToken().getLText()) === false && (lastToken?.isIdentifier() || lastToken?.getLText() === ')')) {
        buckets.push(currentBucket);
        lastToken = this.getToken();
        currentBucket = [this.consumeToken()];
      } else if (this.getToken().getLText() === '(') {
        currentBucket.push(this.consumeToken());
        const [tokens, endToken] = this.advanceParenthesisAware([')'], true, true);
        currentBucket.push(...tokens);
        lastToken = endToken;
      } else {
        lastToken = this.getToken();
        currentBucket.push(this.consumeToken());
      }
    }
    buckets.push(currentBucket);

    const subtypeIndication = new O.OSubtypeIndication(this.parent, startToken.range.copyWithNewEnd(this.getToken(-1, true).range));
    if (buckets.length === 1) {
      subtypeIndication.typeNames = new ExpressionParser(this.state, subtypeIndication, buckets[0]!).parse();
    } else if (buckets.length === 2) {
      // TODO: Find a more reliable way to determine which optional is set
      // With two buckets it can now be resolutionIndication + type or type + constraint.
      if (buckets[1]!.find(token => token.getLText() === 'range')) {
        subtypeIndication.typeNames = new ExpressionParser(this.state, subtypeIndication, buckets[0]!).parse();
        subtypeIndication.constraint = new ExpressionParser(this.state, subtypeIndication, buckets[1]!).parse();
      } else {
        subtypeIndication.resolutionIndication = new ExpressionParser(this.state, subtypeIndication, buckets[0]!).parse();
        subtypeIndication.typeNames = new ExpressionParser(this.state, subtypeIndication, buckets[1]!).parse();
      }

    } else if (buckets.length === 3) {
      subtypeIndication.resolutionIndication = new ExpressionParser(this.state, subtypeIndication, buckets[0]!).parse();
      subtypeIndication.typeNames = new ExpressionParser(this.state, subtypeIndication, buckets[1]!).parse();
      subtypeIndication.constraint = new ExpressionParser(this.state, subtypeIndication, buckets[2]!).parse();
    } else {
      throw new O.ParserError(`Error while parsing subtype indication. Was expecting 1 - 3 buckets found ${buckets.length}`, subtypeIndication.range);
    }
    return subtypeIndication;
  }
}