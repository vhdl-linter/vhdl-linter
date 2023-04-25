import { OLexerToken, TokenType } from "../lexer";
import * as O from "./objects";
import { ParserState } from "./parserBase";
interface ExpParserState {
  maybeOutput: boolean;
  maybeInOut: boolean;
  num: number;
  lastFormal: OLexerToken[]; // This is for checking if the actual is empty
  leftHandSide: boolean; // Is this the left hand of an assignment
  braceLevel: number;
}


export class ExpressionParser {
  private expState: ExpParserState = {
    num: 0,
    lastFormal: [],
    leftHandSide: false,
    maybeOutput: false,
    maybeInOut: false,
    braceLevel: 0
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
  private findLastIndex<T>(array: T[], callback: (a: T) => boolean) {
    for (let i = array.length - 1; i >= 0; i--) {
      if (callback(array[i]!)) {
        return i;
      }
    }
    return -1;
  }
  splitBuffer(buffer: OLexerToken[], formal: boolean, write: boolean, choice: boolean, afterComma: boolean, selectedNamePrefix?: O.OName): O.OName[] {
    const references = [];
    let alternativeIndex = buffer.findIndex(token => token.getLText() === '|');
    while (alternativeIndex > -1) {
      const newBuffer = buffer.slice(0, alternativeIndex);
      references.push(...this.splitBuffer(newBuffer, formal, false, choice, afterComma));
      buffer = buffer.slice(alternativeIndex + 1);
      alternativeIndex = buffer.findIndex(token => token.getLText() === '|');
    }
    // Split literals
    let literalIndex = buffer.findIndex(token => token.isLiteral());
    while (literalIndex > -1 && literalIndex < buffer.length - 1) {
      const newBuffer = buffer.slice(0, alternativeIndex);
      references.push(...this.splitBuffer(newBuffer, formal, false, choice, afterComma, selectedNamePrefix));
      selectedNamePrefix = undefined;
      afterComma = false;
      buffer = buffer.slice(literalIndex + 1);
      literalIndex = buffer.findIndex(token => token.isLiteral());
    }
    // Split new
    const newIndex = buffer.findIndex(token => token.getLText() === 'new');
    if (newIndex > -1 && newIndex < buffer.length - 1) {
      const newBuffer = buffer.slice(0, alternativeIndex);
      references.push(...this.splitBuffer(newBuffer, formal, false, choice, afterComma, selectedNamePrefix));
      selectedNamePrefix = undefined;
      buffer = buffer.slice(newIndex + 1);
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
      references.push(...this.convertToName(buffer, formal, write, choice, afterComma, selectedNamePrefix));
      if (lastAttributeReference) {
        lastAttributeReference.prefix = references[references.length - 1]!;
      }
    }
    return references;
  }
  convertToName(buffer: OLexerToken[], formal: boolean, write: boolean, choice: boolean, afterComma: boolean, selectedNamePrefix?: O.OName) {
    buffer = buffer.filter(token => token.isDesignator() || token.getLText() === 'all' || token.type === TokenType.implicit
      || token.type === TokenType.keyword || token.isLiteral());
    const names: O.OName[] = [];
    const prefixWrite: O.OName[] = [];
    const prefixRead: O.OName[] = [];
    if (buffer.length > 1) {
      throw new O.ParserError(`Internal Error: convertName expected one token only gotten ${buffer.length}`, buffer[0]!.range.copyWithNewEnd(buffer.at(-1)!.range));
    }
    for (const token of buffer) {
      if (choice) {
        names.push(new O.OChoice(this.parent, token));
      } else if (formal) {
        const name = new O.OName(this.parent, token);
        name.maybeFormal = true;
        names.push(name);
      } else if (selectedNamePrefix) {
        if (write && (this.expState.leftHandSide || this.expState.maybeOutput || this.expState.maybeInOut)) {
          const prefixList = [selectedNamePrefix];
          if (selectedNamePrefix instanceof O.OSelectedName) {
            prefixList.unshift(...selectedNamePrefix.prefixTokens);
          }

          const write = new O.OSelectedName(this.parent, token, [selectedNamePrefix], true);
          names.push(write);
          prefixWrite.push(write);
          write.inAssociation = this.expState.maybeOutput || this.expState.maybeInOut;
          if (this.expState.maybeInOut) {
            const name = new O.OSelectedName(this.parent, token, [selectedNamePrefix]);
            names.push(name);
            prefixRead.push(name);

          }
        } else {
          const name = new O.OSelectedName(this.parent, token, [selectedNamePrefix]);
          names.push(name);
          prefixRead.push(name);
        }

      } else {
        if (write && (this.expState.leftHandSide || this.expState.maybeOutput || this.expState.maybeInOut)) {
          const write = new O.OName(this.parent, token, true);
          write.inAssociation = this.expState.maybeOutput || this.expState.maybeInOut;
          names.push(write);
          prefixWrite.push(write);
          if (this.expState.maybeInOut) {
            const name = new O.OName(this.parent, token);
            names.push(name);
            prefixRead.push(name);
          }
        } else {
          const name = new O.OName(this.parent, token);
          names.push(name);
          prefixRead.push(name);

        }
      }
    }
    if (afterComma && names[0]) {
      names[0].afterComma = true;
    }
    return names;
  }
  private inner(maybeFormal = false, maybeWrite = false, maybeChoice = false): O.OName[] {
    const references: O.OName[] = [];
    let tokenBuffer: OLexerToken[] = [];
    let innerReferences: O.OName[][] = [];
    let lastToken: OLexerToken | undefined;
    let parent: O.OName | undefined;
    let afterComma = false;
    let selectedNamePrefix: O.OName | undefined;
    while (this.expState.num < this.tokens.length && this.getNumToken()?.getLText() !== ')') {
      if (this.getNumToken()?.getLText() === '(') {
        this.expState.braceLevel++;
        const aggregateNew = this.getNumToken(-1) === undefined || this.getNumToken(-1)!.getLText() === '\'';
        this.increaseToken();
        const maybeFormalNew = this.getNumToken(-2) !== undefined && this.getNumToken(-2)?.getLText() !== '(' && this.getNumToken(-3)?.isIdentifier() !== true;
        innerReferences.push(this.inner(maybeFormalNew, aggregateNew, aggregateNew));
      } else if (this.getNumToken()!.getLText() === '<<') {
        const externalName = this.parseExternalName();
        if (externalName) {
          innerReferences.push([externalName]);
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
          "." //Selected Name
        ];

        // If the token is one of the break tokens a new name/selected name or combined identifier starts.
        // The collected tokens up to this point are then split and converted into OReferences and other objects
        const breakToken = breakTokens.find(token => token === (this.getNumToken()?.getLText() ?? ''));
        // Attributes are handled as one block, so check that the break token is not after a attribute ' mark.
        // Two Identifiers after each other is a bit of a workaround. Normally this should not be possible. It happens if higher level parser splits a bit wrong.
        // (For example resolution_indication and type_mark are only separated by space and can thus not be easily split)
        if ((breakToken !== undefined || (this.getNumToken()?.isIdentifier() && this.getNumToken(-1)?.isIdentifier())) && lastToken?.getLText() !== '\'') {
          const formal = maybeFormal && breakToken === '=>';
          const choice = maybeChoice && breakToken === '=>';
          const selectedName = breakToken === '.';
          // If braces were contained. This token was a cast on the formal side (so a reference not formal)
          const newReferences = this.splitBuffer(tokenBuffer, formal, maybeWrite, choice, afterComma, selectedNamePrefix);
          references.push(...newReferences);
          if (newReferences.length > 0) {
            afterComma = false;
          }
          parent = newReferences.at(-1);
          if (selectedName) {
            selectedNamePrefix = newReferences.at(-1);
          } else {
            selectedNamePrefix = undefined;
          }


          // Only the first token can be a write. For example signal.record_element only the signal is written.
          // The exception is in an aggregate all aggregate elements are written. (aggregate elements are separated by ',')
          if (breakToken !== ',' && breakToken !== '=>') {
            maybeWrite = false;
          }
          for (const innerRef of innerReferences) {
            // This is a bit hacky... When there is a cast in the formal reference side. Assume the last token is the actual formal reference
            // Ie to_integer(unsigned(output)) output would be the actual formal part. ant to_integer and unsigned are normal references
            if (formal && innerRef.length > 0) {
              Object.setPrototypeOf(O.getTheInnermostNameChildren(innerRef.at(-1)!), O.OFormalName.prototype);
            }
            if (parent) {
              parent.children.push(innerRef);
              for (const innerReference of innerRef) {
                innerReference.parent = parent;
              }
            } else {
              if (innerRef.length > 0) {
                const aggregate = new O.OAggregate(this.parent, new OLexerToken('', innerRef[0]!.range, TokenType.implicit, innerRef[0]!.rootFile));
                aggregate.afterComma = afterComma;
                aggregate.children = [innerRef];
                for (const innerReference of innerRef) {
                  innerReference.parent = aggregate;
                }
                references.push(aggregate);
              }
            }
          }
          innerReferences = [];
          if (formal) {
            this.expState.lastFormal = tokenBuffer;
          }
          tokenBuffer = [];
          // After Comma state must be stayed over minus sign in case it is used as a sign
          afterComma = breakToken === ',' || (afterComma && breakToken === '-');

          parent = undefined;

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
    const newReferences = this.splitBuffer(tokenBuffer, false, maybeWrite, false, afterComma, selectedNamePrefix);
    if (newReferences.length > 0) {
      parent = newReferences.at(-1);
    }
    references.push(...newReferences);
    if (this.getNumToken()?.getLText() === ')') {
      this.expState.braceLevel--;
    }
    if (this.expState.lastFormal.length > 0 && tokenBuffer.length === 0) {
      this.state.messages.push({
        message: "The actual part cannot be empty.",
        range: this.expState.lastFormal[0]!.range.copyWithNewEnd(this.expState.lastFormal[this.expState.lastFormal.length - 1]!.range)
      });
    }
    for (const innerRef of innerReferences) {
      if (parent) {
        parent.children.push(innerRef);
        for (const innerReference of innerRef) {
          innerReference.parent = parent;
        }
      } else {
        if (innerRef.length > 0) {
          const aggregate = new O.OAggregate(this.parent, new OLexerToken('', innerRef[0]!.range, TokenType.implicit, innerRef[0]!.rootFile));
          aggregate.children = [innerRef];
          aggregate.afterComma = afterComma;

          for (const innerReference of innerRef) {
            innerReference.parent = aggregate;
          }
          references.push(aggregate);
        }
      }
    }
    innerReferences = [];
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
  parseConstraint() {
    if (this.tokens.length === 0) {
      this.state.messages.push({
        message: 'expression empty',
        range: this.parent.range
      });
      return [];
    }
    if (this.tokens[0]!.getLText() === 'range') {
      return this.parse();
    }
    const result = [];
    while (this.getNumToken()?.getLText() === '(') {
      this.increaseToken();
      const aggregate = new O.OAggregate(this.parent, new OLexerToken('', this.tokens[0]!.range, TokenType.implicit, this.parent.rootFile));

      result.push(...this.innerConstraint(aggregate));

    }
    return result;
  }

  innerConstraint(parent: O.OName ) {
    // Search for direction (to|downto) than this is range (5.2.1) and is parsed as an expression
    const tokens = this.scanInnerConstraintForDirection();
    if (tokens) {
      this.expState.num += tokens.length;
      return new ExpressionParser(this.state, parent, tokens).parse();
    }
    const names: O.OName[] = [];
    while (this.expState.num < this.tokens.length && this.getNumToken()?.getLText() !== ')') {
      if (this.getNumToken()?.getLText() === '(') {
        const elementParent = names.length > 0 ? names.at(-1)! :
          new O.OAggregate(this.parent, new OLexerToken('', this.tokens[0]!.range, TokenType.implicit, this.parent.rootFile));

        this.increaseToken();
        const innerNames = this.innerConstraint(names.at(-1)!);
        for (const innerName of innerNames) {
          innerName.parent = elementParent;
          if (parent.children.length > 0) {
            parent.children.at(-1)!.push(innerName);
          } else {
            parent.children.push([innerName]);
          }
        }
      } else if (this.getNumToken()?.getLText() !== ',') {
        let name;
        if (this.getNumToken(-1)?.getLText() === '\'') {
          name = new O.OAttributeName(parent, this.getNumToken()!);
        } else {
          name = new O.OName(parent, this.getNumToken()!);

        }
        name.constraint = true;
        if (parent instanceof O.OName) {
          if (parent.children.length > 0) {
            parent.children.at(-1)!.push(name);
          } else {
            parent.children.push([name]);
          }
        }
        names.push(name);
      }
      this.increaseToken();
    }
    this.increaseToken();
    return names;
  }
  // Scan for direction (to|downto). Return the expression part when direction found
  scanInnerConstraintForDirection() {
    const tokens = [];
    let adder = 0;
    while (this.expState.num + adder < this.tokens.length && this.getNumToken(adder)?.getLText() !== ')') {
      if (this.getNumToken(adder)?.getLText() === '(') { // skip brace
        let braceIndex = 0;
        while (this.expState.num + adder < this.tokens.length) {
          if (this.getNumToken(adder)?.getLText() === '(') {
            braceIndex++;
          } else if (this.getNumToken(adder)?.getLText() === ')') {
            if (braceIndex === 0) {
              adder++;
              break;
            }
            braceIndex--;
          }
          adder++;
        }

      } else {
        tokens.push(this.getNumToken(adder)!);
      }
      adder++;
    }
    if (tokens.some(token => token.getLText() === "downto" || token.getLText() === 'to')) {
      return tokens;
    }
    return undefined;

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