import { OLexerToken } from "../lexer";
import * as O from "./objects";
import { ParserState } from "./parserBase";
interface ExpParserState {
  maybeOutput: boolean;
  maybeInOut: boolean;
  num: number;
  lastFormal: OLexerToken[]; // This is for checking if the actual is empty
  leftHandSide: boolean; // Is this the left hand of an assignment
}


export class ExpressionParser {
  private expState: ExpParserState = {
    num: 0,
    lastFormal: [],
    leftHandSide: false,
    maybeOutput: false,
    maybeInOut: false
  };
  constructor(private state: ParserState, private parent: O.ObjectBase, private tokens: OLexerToken[]) {
  }

  parse(): O.OName[] {
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
      if (callback(array[i]!)) {
        return i;
      }
    }
    return -1;
  }
  splitBuffer(buffer: OLexerToken[], formal: boolean, write: boolean, choice: boolean): O.OName[] {
    const references = [];
    let alternativeIndex = buffer.findIndex(token => token.getLText() === '|');
    while (alternativeIndex > -1) {
      const newBuffer = buffer.slice(0, alternativeIndex);
      references.push(...this.splitBuffer(newBuffer, formal, false, choice));
      buffer = buffer.slice(alternativeIndex + 1);
      alternativeIndex = buffer.findIndex(token => token.getLText() === '|');
    }

    let attributeIndex = this.findLastIndex(buffer, token => token.getLText() === '\'');
    let lastAttributeReference: O.OAttributeName | undefined;
    while (attributeIndex > -1) {
      // If there is not a name after ' mark. This is a type designation
      const reference = buffer[attributeIndex + 1];
      if (reference) {
        const attributeReference = new O.OAttributeName(this.parent, reference);
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
      references.push(...this.convertToReference(buffer, formal, write, choice));
      if (lastAttributeReference) {
        lastAttributeReference.prefix = references[references.length - 1]!;
      }
    }
    return references;
  }
  convertToReference(buffer: OLexerToken[], formal: boolean, write: boolean, choice: boolean) {
    buffer = buffer.filter(token => token.isDesignator());
    const references: O.OName[] =  [];
    const prefixWrite: O.OName[] = [];
    const prefixRead: O.OName[] = [];
    for (const [index, token] of buffer.entries()) {
      if (choice) {
        references.push(new O.OChoice(this.parent, token));
      } else if (formal) {
        references.push(new O.OFormalName(this.parent, token));
      } else if (index > 0) {
        if (write && (this.expState.leftHandSide || this.expState.maybeOutput || this.expState.maybeInOut) ) {
          const write = new O.OSelectedName(this.parent, token, prefixWrite.slice(0) as O.SelectedNamePrefix, true);
          references.push(write);
          prefixWrite.push(write);
          write.inAssociation = this.expState.maybeOutput || this.expState.maybeInOut;
          if (this.expState.maybeInOut) {
            const name = new O.OSelectedName(this.parent, token, prefixRead.slice(0) as O.SelectedNamePrefix);
            references.push(name);
            prefixRead.push(name);

          }
        } else {
          const name = new O.OSelectedName(this.parent, token, prefixRead.slice(0) as O.SelectedNamePrefix);
          references.push(name);
          prefixRead.push(name);
        }
      } else {
        if (write && (this.expState.leftHandSide || this.expState.maybeOutput || this.expState.maybeInOut)) {
          const write = new O.OName(this.parent, token, true);
          write.inAssociation = this.expState.maybeOutput || this.expState.maybeInOut;
          references.push(write);
          prefixWrite.push(write);
          if (this.expState.maybeInOut) {
            const name = new O.OName(this.parent, token);
            references.push(name);
            prefixRead.push(name);
          }
        } else {
          const name = new O.OName(this.parent, token);
          references.push(name);
          prefixRead.push(name);

        }
      }
    }
    return references;
  }
  private inner(maybeFormal = false, maybeWrite = false, maybeChoice = false): O.OName[] {
    const references: O.OName[] = [];
    let tokenBuffer: OLexerToken[] = [];
    let innerReferences: O.OName[] | undefined;
    let containedBraces = false;
    let lastToken: OLexerToken | undefined;
    while (this.expState.num < this.tokens.length && this.getNumToken()?.getLText() !== ')') {
      if (this.getNumToken()?.getLText() === '(') {
        const aggregateNew = this.getNumToken(-1) === undefined || this.getNumToken(-1)!.getLText() === '\'';
        this.increaseToken();
        const maybeFormalNew = this.getNumToken(-2) !== undefined && this.getNumToken(-2)?.getLText() !== '(' && this.getNumToken(-3)?.isIdentifier() !== true;
        innerReferences = this.inner(maybeFormalNew, aggregateNew, aggregateNew);
        containedBraces = true;
      } else if (this.getNumToken()!.getLText() === '<<') {
        const externalName = this.parseExternalName();
        if (externalName) {
          innerReferences = [externalName];
        }
      } else {
        const breakTokens = [',', '=>',
          'range', 'to', 'downto', // range constraints
          '*', '/', 'mod', 'rem', // term
          'abs', 'not', '**', // factor
          'and', 'or', 'xor', 'nand', 'nor', 'xnor', //logical expression
          "=", "/=", "<", "<=", ">", ">=", "?=", "?/=", "?<", "?<=", "?>", "?>=", //relation
          "sll", "srl", "sla", "sra", "rol", "ror", //shiftExpression
          "+", "-", "&", //adding_operator
          "*", "/", "mod", "rem", //multiplying_operator
        ];

        // If the token is one of the break tokens a new name/selected name or combined identifier starts.
        // The collected tokens up to this point are then split and converted into OReferences and other objects
        const breakToken = breakTokens.find(token => token === (this.getNumToken()?.getLText() ?? ''));
        // Attributes are handled as one block, so check that the break token is not after a attribute ' mark.
        // Two Identifiers after each other is a bit of a workaround. Normally this should not be possible. It happens if higher level parser splits a bit wrong.
        // (For example resolution_indication and type_mark are only separated by space and can thus not be easily split)
        if ((breakToken || (this.getNumToken()?.isIdentifier() && this.getNumToken(-1)?.isIdentifier())) && lastToken?.getLText() !== '\'') {
          const formal = maybeFormal && breakToken === '=>';
          const choice = maybeChoice && breakToken === '=>';
          // If braces were contained. This token was a cast on the formal side (so a reference not formal)
          references.push(...this.splitBuffer(tokenBuffer, formal && containedBraces === false, maybeWrite, choice));

          // Only the first token can be a write. For example signal.record_element only the signal is written.
          // The exception is in an aggregate all aggregate elements are written. (aggregate elements are separated by ',')
          if (breakToken !== ',' && breakToken !== '=>') {
            maybeWrite = false;
          }
          if (innerReferences) {
            // This is a bit hacky... When there is a cast in the formal reference side. Assume the last token is the actual formal reference
            // Ie to_integer(unsigned(output)) output would be the actual formal part. ant to_integer and unsigned are normal references
            if (formal && innerReferences.length > 0) {
              Object.setPrototypeOf(innerReferences[innerReferences.length - 1], O.OFormalName.prototype);
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
          const token = this.getNumToken();
          if (token) {
            tokenBuffer.push(token);
          }
        }
      }
      lastToken = this.getNumToken();
      this.increaseToken();
    }
    references.push(...this.splitBuffer(tokenBuffer, false, maybeWrite, false));
    if (this.expState.lastFormal.length > 0 && tokenBuffer.length === 0) {
      this.state.messages.push({
        message: "The actual part cannot be empty.",
        range: this.expState.lastFormal[0]!.range.copyWithNewEnd(this.expState.lastFormal[this.expState.lastFormal.length - 1]!.range)
      });
    }
    if (innerReferences !== undefined) {
      references.push(...innerReferences);
      innerReferences = undefined;
    }
    this.expState.lastFormal = [];
    return references;

  }
  parseTarget(): O.OName[] {
    if (this.tokens.length === 0) {
      this.state.messages.push({
        message: 'expression empty',
        range: this.parent.range
      });
      return [];
    }
    this.expState.leftHandSide = true;
    const result = this.inner(false, true);


    return result;
  }
  parseAssociationElement(maybeOutput = false, maybeInOut = false): O.OName[] {
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
  parseExternalName(): O.OExternalName | undefined {
    // << token
    const ltToken = this.getNumToken()!;
    this.increaseToken();

    const kind = this.getNumToken();
    if (!kind) {
      this.state.messages.push({
        message: 'empty external name path',
        range: this.parent.range
      });
      return;
    }
    this.increaseToken();
    const path = [];
    while (this.getNumToken()?.getLText() !== ':') {
      const token = this.getNumToken();
      if (!token) {
        throw new O.ParserError(`: not found in external name`, this.tokens[0]!.range.copyWithNewEnd(this.tokens.at(-1)!.range));
      }
      path.push(token);
      this.increaseToken();
    }
    this.increaseToken();
    const typeTokens = [];
    while (this.getNumToken()?.getLText() !== '>>') {
      const token = this.getNumToken();
      if (!token) {
        throw new O.ParserError(`Did not find >> for external name`, this.tokens[0]!.range.copyWithNewEnd(this.tokens.at(-1)!.range));

      }
      typeTokens.push(token);
      this.increaseToken();
    }
    const gtToken = this.getNumToken()!;
    this.increaseToken();
    if (path.length === 0) {
      return;
    } else {
      const externalName = new O.OExternalName(this.parent, path as ([OLexerToken]), kind, ltToken.range.copyWithNewEnd(gtToken.range));
      externalName.typeNames = new ExpressionParser(this.state, externalName, typeTokens).parse();
      return externalName;
    }
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