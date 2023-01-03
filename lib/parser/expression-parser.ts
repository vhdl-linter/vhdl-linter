import { OLexerToken } from "../lexer";
import { OAttributeReference, ObjectBase, OFormalReference, OReference, OSelectedName, OSelectedNameWrite, OWrite, ParserError, SelectedNamePrefix } from "./objects";
import { ParserBase, ParserState } from "./parser-base";
type ExpParserState = {
  num: number;
  lastFormal: OLexerToken[]; // This is for checking if the actual is empty
  leftHandSide: boolean; // Is this the left hand of an assignment
};


export class ExpressionParser extends ParserBase {
  private expState: ExpParserState = {
    num: 0,
    lastFormal: [],
    leftHandSide: false
  };
  constructor(state: ParserState, private parent: ObjectBase, private tokens: OLexerToken[]) {
    super(state);
    this.debug('start');
  }

  parse(): OReference[] {
    if (this.tokens.length === 0) {
      this.state.messages.push({
        message: 'expression empty',
        range: this.parent.range
      });
      return [];
    }
    const result = this.inner();
    return result;
  }
  splitBuffer(buffer: OLexerToken[], formal: boolean, write: boolean): OReference[] {
    const references = [];
    let alternativeIndex = buffer.findIndex(token => token.getLText() === '|');
    while (alternativeIndex > -1) {
      const newBuffer = buffer.slice(0, alternativeIndex);
      references.push(...this.splitBuffer(newBuffer, formal, false));
      buffer = buffer.slice(alternativeIndex + 1);
      alternativeIndex = buffer.findIndex(token => token.getLText() === '|');
    }

    const attributeIndex = buffer.findIndex(token => token.getLText() === '\'');
    if (attributeIndex > -1) {
      const attributeReferences = this.convertToReference(buffer.slice(0, attributeIndex), false, false);
      references.push(...attributeReferences);
      for (const token of buffer.slice(attributeIndex + 1)) {
        references.push(new OAttributeReference(this.parent, token, attributeReferences[attributeReferences.length - 1]));
      }
    } else {
      references.push(...this.convertToReference(buffer, formal, write));

    }
    return references;
  }
  convertToReference(buffer: OLexerToken[], formal: boolean, write: boolean) {
    buffer = buffer.filter(token => token.isDesignator());
    const references = [];
    for (const [index, token] of buffer.entries()) {
      if (formal) {
        references.push(new OFormalReference(this.parent, token));
      } else if (index > 0) {
        if (write && this.expState.leftHandSide) {
          references.push(new OSelectedNameWrite(this.parent, token, buffer.slice(0, index) as SelectedNamePrefix));
        } else {
          references.push(new OSelectedName(this.parent, token, buffer.slice(0, index) as SelectedNamePrefix));
        }
      } else {
        if (write && this.expState.leftHandSide) {
          references.push(new OWrite(this.parent, token));
        } else {
          references.push(new OReference(this.parent, token));
        }
      }
    }
    return references;
  }
  inner(maybeFormal = false, maybeWrite = false): OReference[] {
    const references: OReference[] = [];
    let tokenBuffer: OLexerToken[] = [];
    let innerReferences: OReference[] | undefined;
    while (this.expState.num < this.tokens.length && this.getNumToken()?.getLText() !== ')') {
      if (this.getNumToken()?.getLText() === '(') {
        this.increaseToken();
        const maybeFormalNew = this.getNumToken(-2) !== undefined && this.getNumToken(-2)?.getLText() !== '(';
        innerReferences = this.inner(maybeFormalNew, maybeFormalNew === false);

      } else {
        const breakTokens = [',', '=>',
          'range', 'to', // range constraints
          '*', '/', 'mod', 'rem', // term
          'and', 'or', 'xor', 'nand', 'nor', 'xnor', //logical expression
          "=", "/=", "<", "<=", ">", ">=", "?=", "?/=", "?<", "?<=", "?>", "?>=", //relation
          "sll", "srl", "sla", "sra", "rol", "ror", //shiftExpression
          "+", "-", "&", //adding_operator
          "*", "/", "mod", "rem", //multiplying_operator
        ];


        const breakToken = breakTokens.find(token => token === this.getNumToken()?.getLText() ?? '');
        if (breakToken) {
          const formal = maybeFormal && breakToken === '=>';
          references.push(...this.splitBuffer(tokenBuffer, formal, maybeWrite));
          if (breakToken !== ',') {
            maybeWrite = false;
          }
          if (innerReferences) {
            references.push(...innerReferences);
            innerReferences = undefined;

          }
          // if (this.expState.lastFormal.length > 0 && tokenBuffer.length === 0) {
          //   throw new ParserError("The actual part cannot be empty.", this.expState.lastFormal[0].range.copyWithNewEnd(this.expState.lastFormal[this.expState.lastFormal.length - 1].range));
          // }
          if (formal) {
            this.expState.lastFormal = tokenBuffer;
          }
          tokenBuffer = [];
        } else {
          tokenBuffer.push(this.getNumToken() as OLexerToken);
        }
      }

      this.increaseToken();
    }
    references.push(...this.splitBuffer(tokenBuffer, false, maybeWrite));
    if (this.expState.lastFormal.length > 0 && tokenBuffer.length === 0) {
      throw new ParserError("The actual part cannot be empty.", this.expState.lastFormal[0].range.copyWithNewEnd(this.expState.lastFormal[this.expState.lastFormal.length - 1].range));
    }
    if (innerReferences !== undefined) {
      references.push(...innerReferences);
      innerReferences = undefined;
    }
    this.expState.lastFormal = [];
    return references;

  }
  parseTarget(): [OReference[], OWrite[]] {
    if (this.tokens.length === 0) {
      this.state.messages.push({
        message: 'expression empty',
        range: this.parent.range
      });
      return [[], []];
    }
    this.expState.leftHandSide = true;
    const result = this.inner();
    const references = result.slice(1);
    const writes = result.slice(0, 1).map(a => { // TODO: Improve handling of left hand assignment
      Object.setPrototypeOf(a, OWrite.prototype);
      (a as OWrite).type = 'OWrite';
      return a as OWrite;
    });
    return [references, writes];
  }
  parseAssociationElement() {
    if (this.tokens.length === 0) {
      this.state.messages.push({
        message: 'expression empty',
        range: this.parent.range
      });
      return [];
    }
    const result = this.inner(true);
    return result;
  }


  // // This gets the current Text (for Debugger)
  getTextDebug() {
    return this.tokens.slice(this.expState.num, this.expState.num + 5).join(' ');
  }


  private getNumToken(diffToken = 0): OLexerToken | undefined {
    let diff = 0;
    if (diffToken > 0) {
      for (let i = 0; i < diffToken; i++) {
        do {
          diff++;
        } while (this.tokens[this.expState.num + diff]?.isWhitespace());
      }
    } else if (diffToken < 0) {
      for (let i = 0; i > diffToken; i--) {
        do {
          diff--;
        } while (this.tokens[this.expState.num + diff]?.isWhitespace());
      }
    }
    return this.tokens[this.expState.num + diff];
  }
  private increaseToken() {
    do {
      this.expState.num++;
    } while (this.getNumToken()?.isWhitespace());
  }
}