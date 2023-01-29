import { OLexerToken } from "../lexer";
import { OAttributeReference, ObjectBase, OFormalReference, OReference, OSelectedName, OSelectedNameWrite, OWrite, ParserError, SelectedNamePrefix } from "./objects";
import { ParserBase, ParserState } from "./parser-base";
type ExpParserState = {
  maybeOutput: boolean;
  maybeInOut: boolean;
  num: number;
  lastFormal: OLexerToken[]; // This is for checking if the actual is empty
  leftHandSide: boolean; // Is this the left hand of an assignment
};


export class ExpressionParser extends ParserBase {
  private expState: ExpParserState = {
    num: 0,
    lastFormal: [],
    leftHandSide: false,
    maybeOutput: false,
    maybeInOut: false
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
  // Shim, until supported by ESNEXT
  private findLastIndex<T>(array: T[], callback: (a: T) => boolean ) {
    for (let i = array.length - 1; i >= 0; i--) {
      if (callback(array[i])) {
        return i;
      }
    }
    return -1;
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

    let attributeIndex = this.findLastIndex(buffer, token => token.getLText() === '\'');
    let lastAttributeReference: OAttributeReference | undefined;
    while (attributeIndex > -1) {
      // If there is not a name after ' mark. This is a type designation
      if (buffer[attributeIndex + 1] !== undefined) {
        const attributeReference = new OAttributeReference(this.parent, buffer[attributeIndex + 1]);
        references.push(attributeReference);
        if (lastAttributeReference) {
          attributeReference.prefix = attributeReference;
        }
        lastAttributeReference = attributeReference;
      }
      buffer = buffer.slice(0, attributeIndex);
      attributeIndex = this.findLastIndex(buffer, token => token.getLText() === '\'');

    }
    if (attributeIndex === -1) {
      references.push(...this.convertToReference(buffer, formal, write));
      if (lastAttributeReference) {
        lastAttributeReference.prefix = references[references.length - 1];
      }
    }
    return references;
  }
  convertToReference(buffer: OLexerToken[], formal: boolean, write: boolean) {
    buffer = buffer.filter(token => token.isDesignator());
    const references: OReference[] = [];
    const writes: OReference[] = [];
    for (const [index, token] of buffer.entries()) {
      if (formal) {
        references.push(new OFormalReference(this.parent, token));
      } else if (index > 0) {
        if (write && (this.expState.leftHandSide || this.expState.maybeOutput || this.expState.maybeInOut) ) {
          const write = new OSelectedNameWrite(this.parent, token, writes.slice(0, index) as SelectedNamePrefix);
          writes.push(write);
          write.inAssociation = this.expState.maybeOutput || this.expState.maybeInOut;
          if (this.expState.maybeInOut) {
            references.push(new OSelectedName(this.parent, token, references.slice(0, index) as SelectedNamePrefix));
          }
        } else {
          references.push(new OSelectedName(this.parent, token, references.slice(0, index) as SelectedNamePrefix));
        }
      } else {
        if (write && (this.expState.leftHandSide || this.expState.maybeOutput || this.expState.maybeInOut)) {
          const write = new OWrite(this.parent, token);
          write.inAssociation = this.expState.maybeOutput || this.expState.maybeInOut;
          writes.push(write);
          if (this.expState.maybeInOut) {
            references.push(new OReference(this.parent, token));
          }
        } else {
          references.push(new OReference(this.parent, token));
        }
      }
    }
    return references.concat(writes);
  }
  private inner(maybeFormal = false, maybeWrite = false): OReference[] {
    const references: OReference[] = [];
    let tokenBuffer: OLexerToken[] = [];
    let innerReferences: OReference[] | undefined;
    let containedBraces = false;
    let lastToken: OLexerToken | undefined;
    while (this.expState.num < this.tokens.length && this.getNumToken()?.getLText() !== ')') {
      if (this.getNumToken()?.getLText() === '(') {
        const aggregate = this.getNumToken(-1) === undefined;
        this.increaseToken();
        const maybeFormalNew = this.getNumToken(-2) !== undefined && this.getNumToken(-2)?.getLText() !== '(';
        innerReferences = this.inner(maybeFormalNew, aggregate);
        containedBraces = true;
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

        // If the token is one of the break tokens a new name/selected name or combined identifier starts.
        // The collected tokens up to this point are then split and converted into OReferences and other objects
        const breakToken = breakTokens.find(token => token === this.getNumToken()?.getLText() ?? '');
        // Attributes are handled as one block, so check that the break token is not after a attribute ' mark.
        if (breakToken && lastToken?.getLText() !== '\'') {
          const formal = maybeFormal && breakToken === '=>';
          // If braces were contained. This token was a cast on the formal side (so a reference not formal)
          references.push(...this.splitBuffer(tokenBuffer, formal && containedBraces === false, maybeWrite));

          // Only the first token can be a write. For example signal.record_element only the signal is written.
          // The exception is in an aggregate all aggregate elements are written. (aggregate elements are separated by ',')
          if (breakToken !== ',' && breakToken !== '=>') {
            maybeWrite = false;
          }
          if (innerReferences) {
            // This is a bit hacky... When there is a cast in the formal reference side. Assume the last token is the actual formal reference
            // Ie to_integer(unsigned(output)) output would be the actual formal part. ant to_integer and unsigned are normal references
            if (formal && innerReferences.length > 0) {
              Object.setPrototypeOf(innerReferences[innerReferences.length - 1], OFormalReference.prototype);
            }
            references.push(...innerReferences);
            innerReferences = undefined;
          }
          if (formal) {
            this.expState.lastFormal = tokenBuffer;
          }
          tokenBuffer = [];
          containedBraces = false;
        } else {
          tokenBuffer.push(this.getNumToken() as OLexerToken);
        }
      }
      lastToken = this.getNumToken();
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
    const result = this.inner(false, true);


    return [
      result.filter(ref => ref instanceof OWrite === false),
      result.filter(ref => ref instanceof OWrite) as OWrite[]
    ];
  }
  parseAssociationElement(maybeOutput = false, maybeInOut = false): OReference[] {
    if (this.tokens.length === 0) {
      this.state.messages.push({
        message: 'expression empty',
        range: this.parent.range
      });
      return [];
    }
    if (maybeOutput) {
      this.expState.maybeOutput = true;
    }
    if (maybeInOut) {
      this.expState.maybeInOut = true;
    }

    const result = this.inner(true, maybeOutput || maybeInOut);
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