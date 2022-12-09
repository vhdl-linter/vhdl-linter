import { OLexerToken, TokenType } from "../lexer";
import { OAttributeReference, ObjectBase, OFormalReference, OReference, ParserError } from "./objects";
type resultType = false | [OReference[], ParserState];
type ParserState = {
  reference?: OReference;
  type: 'expression' | 'root' | 'simpleName' | 'name'
  num: number;
  parent? : ParserState;
};
export class ExpressionParser {

  constructor(private parent: ObjectBase, private tokens: OLexerToken[]) {

  }
  parse(): OReference[] {
    if (this.tokens.length === 0) {
      throw new ParserError('expression empty', this.parent.range);

    }
    const result = this.parseExpression({ num: 0, type: 'root'});
    if (result) {
      if (result[1].num !== this.tokens.length) {
        throw new ParserError('expression parser not successful (remainder left)', this.tokens[0].range.copyWithNewEnd(this.tokens[this.tokens.length - 1].range));
      }
      return result[0];
    }
    throw new ParserError('expression parser not successful (no match)', this.tokens[0].range.copyWithNewEnd(this.tokens[this.tokens.length - 1].range));

  }
  parseTarget(): OReference[] {
    if (this.tokens.length === 0) {
      throw new ParserError('expression empty', this.parent.range);
    }
    const result = this.parseName({ num: 0, type: 'root' }) || this.parseAggregate({ num: 0, type: 'root' });
    if (result) {
      if (result[1].num !== this.tokens.length) {
        throw new ParserError('expression parseTarget not successful (remainder left)', this.tokens[0].range.copyWithNewEnd(this.tokens[this.tokens.length - 1].range));
      }
      return result[0];
    }
    throw new ParserError('expression parseTarget not successful (no match)', this.tokens[0].range.copyWithNewEnd(this.tokens[this.tokens.length - 1].range));
  }
  parseExpression(state: ParserState): resultType {
    state = {
      num: state.num,
      type: 'expression',
      parent: state
    };
    return this.alternatives(state,
      state => this.chain(state,
        state => this.parseKeyword(state, '??'),
        state => this.parsePrimary(state)),
      state => this.parseLogicalExpression(state)
    );
  }
  getTextDebug(state: ParserState) { // This gets the current Text (for Debugger)
    return this.tokens.slice(state.num, 5).join(' ');

  }
  parseLogicalExpression(state: ParserState) {
    return this.alternatives(state,
      state => this.chain(state,
        state => this.parseRelation(state),
        state => this.multiple(state, true,
          state => this.chain(state,
            state => this.parseKeyword(state, 'and', 'or', 'xor', 'xnor'),
            state => this.parseRelation(state)
          )
        )
      ),
      state => this.chain(state,
        state => this.parseRelation(state),
        state => this.optional(state,
          state => this.chain(state,
            state => this.parseKeyword(state, 'nand', 'nor'),
            state => this.parseRelation(state)
          )
        )
      ),
    );
  }
  parseRelation(state: ParserState) {
    return this.chain(state,
      state => this.parseShiftExpression(state),
      state => this.optionalChain(state,
        state => this.parseKeyword(state, '=', '/=', '<', '<=', '>', '>=', '?=', '?/=', '? ', '?<=', '?>', '?>='),
        state => this.parseShiftExpression(state)
      )
    );

  }
  parseShiftExpression(state: ParserState) {

    return this.chain(state,
      state => this.parseSimpleExpression(state),
      state => this.optionalChain(state,
        state => this.parseKeyword(state, 'sll', 'srl', 'sla', 'sra', 'rol', 'ror'),
        state => this.parseSimpleExpression(state)
      )
    );
  }
  parseSimpleExpression(state: ParserState): resultType {
    return this.chain(state,
      state => this.optional(state,
        state => this.parseKeyword(state, '+', '-')
      ),
      state => this.parseTerm(state),
      state => this.multiple(state, false,
        state => this.chain(state,
          state => this.parseKeyword(state, '+', '-', '&'),
          state => this.parseTerm(state)
        )
      )
    );
  }
  parseTerm(state: ParserState): resultType {
    return this.chain(state,
      state => this.parseFactor(state),
      state => this.multiple(state, false,
        state => this.chain(state,
          state => this.parseKeyword(state, '*', '/', 'mod', 'rem'),
          state => this.parseFactor(state)
        )
      )
    );

  }
  parseFactor(state: ParserState): resultType {
    return this.alternatives(state,
      state => this.chain(state,
        state => this.parsePrimary(state),
        state => this.optional(state,
          state => {
            if (this.getNumToken(state)?.getLText() !== '**') {
              return false;
            }
            state = this.increaseToken(state);
            return this.parsePrimary(state);
          })
      ),
      state => this.chain(state,
        state => this.parseKeyword(state, 'abs', 'not', 'and', 'or', 'nand', 'nor', 'xor', 'xnor'),
        state => this.parsePrimary(state))
    );
  }
  parseKeyword(state: ParserState, ...keywords: string[]): resultType {
    if (keywords.indexOf(this.getNumToken(state)?.getLText() ?? '') === -1) {
      return false;
    }
    state = this.increaseToken(state);
    return [[], state];
  }
  chain(state: ParserState, ...links: ((state: ParserState) => resultType)[]): resultType {
    let result;
    const references = [];
    for (const link of links) {
      result = link(state);
      if (result === false) {
        return false;
      }
      references.push(...result[0]);
      state = result[1];
    }
    return [references, state];
  }
  optional(state: ParserState, inner: (state: ParserState) => resultType): resultType {
    const result = inner(state);
    if (result) {
      return result;
    }
    return [[], state];
  }
  optionalChain(state: ParserState, ...links: ((state: ParserState) => resultType)[]): resultType {
    return this.optional(state,
      state => this.chain(state,
        ...links
      )
    );
  }
  parsePrimary(state: ParserState) {
    return this.parseQualifiedExpression(state)
      || this.parseAllocator(state)
      || this.parseName(state)
      || this.parseLiteral(state)
      || this.parseAggregate(state)
      //function call

      ;
  }
  parseAllocator(state: ParserState): resultType {
    return this.chain(state,
      state => this.parseKeyword(state, 'new'),
      state => this.alternatives(state,
        state => this.parseQualifiedExpression(state),
        state => this.parseSubtypeIndication(state),
        )
      );
  }
  parseSubtypeIndication(state: ParserState): resultType {
      return this.chain(state,
        state => this.parseName(state),
        state => this.optional(state,
          state => this.parseConstraint(state)
        )
      );

  }
  parseConstraint(state: ParserState): resultType {
    return this.parseRangeConstraint(state);
    // | array_constraint
      //  | record_constraint
  }
  parseRangeConstraint(state: ParserState): resultType {
    return this.chain(state,
      state => this.parseKeyword(state, 'range'),
      state => this.parseRange(state));
  }
  parseQualifiedExpression(state: ParserState): resultType {
    return this.chain(state,
      state => this.parseName(state),
      state => this.parseKeyword(state, '\''),
      state => this.parseAggregate(state)
    );
  }
  alternatives(state: ParserState, ...alternatives: ((state: ParserState) => resultType)[]) {
    let result;
    for (const alternative of alternatives) {
      result = alternative(state);
      if (result) {
        return result;
      }
    }
    return false;
  }
  multiple(state: ParserState, minimumOne: boolean, inner: (state: ParserState) => resultType): resultType {
    const references = [];
    let result = inner(state);
    if (minimumOne === true && result === false) {
      return false;
    }
    while (result) {
      references.push(...result[0]);
      state = result[1];
      result = inner(state);
    }
    return [references, state];
  }
  multipleChain(state: ParserState, minimumOne: boolean, ...links: ((state: ParserState) => resultType)[]): resultType {
    return this.multiple(state, minimumOne,
      state => this.chain(state,
        ...links
      )
    );
  }


  parseAggregate(state: ParserState): resultType {
    return this.chain(state,
      state => this.parseKeyword(state, '('),
      state => this.parseElementAssociation(state),
      state => this.multiple(state, false,
        state => this.chain(state,
          state => this.parseKeyword(state, ','),
          state => this.parseElementAssociation(state))),
      state => this.parseKeyword(state, ')')
    );
  }
  parseElementAssociation(state: ParserState): resultType {
    return this.chain(state,
      state => this.optional(state,
        state => this.chain(state,
          state => this.parseChoice(state),
          state => this.parseKeyword(state, '=>')
        ),
      ),
      state => this.parseExpression(state)
    );
  }
  parseChoice(state: ParserState): resultType {
    return this.alternatives(state,
      state => this.parseSimpleExpression(state),
      // discrete range
      // element simple name
      state => this.parseKeyword(state, 'others')
    );
  }
  parseName(state: ParserState, as: 'reference' | 'formalReference' | 'attributeReference' = 'reference'): resultType {
    state = {
      num: state.num,
      type: 'name',
      parent: state
    };
    return this.chain(state,
      state => this.alternatives(state,
        state => this.parseSimpleName(state, as),
        state => this.parseOperatorSymbol(state),
        state => this.parseCharacterLiteral(state),
        // state => this.parseIndexedName(state),
        // state => this.parseAttributeName(state),
        //external name
      ),
      state => this.multiple(state, false,
        state => this.alternatives(state,
          state => this.chain(state,
            state => this.parseKeyword(state, '.'),
            state => this.parseSuffix(state)
          ),
          state => this.chain(state,
            state => this.parseKeyword(state, '('),
            state => this.parseAssociationList(state),
            state => this.parseKeyword(state, ')'),
          ),
          state => this.chain(state,
            state => this.parseKeyword(state, '('),
            state => this.parseDiscreteRange(state),
            state => this.parseKeyword(state, ')'),
          ),
          state => this.chain(state,
            state => this.parseKeyword(state, '('),
            state => this.parseExpression(state),
            state => this.multipleChain(state, false,
              state => this.parseKeyword(state, ','),
              state => this.parseExpression(state)
            ),
            state => this.parseKeyword(state, ')')
          ),
          state => this.chain(state,
            state => this.parseKeyword(state, '\''),
            state => this.parseSimpleName(state, 'attributeReference'),
            state => this.optionalChain(state,
              state => this.parseKeyword(state, '('),
              state => this.parseExpression(state),
              state => this.parseKeyword(state, ')'),
            )
          )
        ),
      )
    );


  }
  parseDiscreteRange(state: ParserState): resultType {
    // this.parseSubtypeIndication(state) ||
    return this.parseRange(state);
  }
  parseRange(state: ParserState): resultType {
    // attribute_name
    return this.chain(state,
      state => this.parseSimpleExpression(state),
      state => this.parseKeyword(state, 'to', 'downto'),
      state => this.parseSimpleExpression(state),

    );

  }

  parseAssociationList(state: ParserState): resultType {
    return this.chain(state,
      state => this.parseAssociationElement(state),
      state => this.multipleChain(state, false,
        state => this.parseKeyword(state, ','),
        state => this.parseAssociationElement(state)
      )
    );
  }
  parseAssociationElement(state: ParserState): resultType {
    return this.chain(state,
      state => this.optionalChain(state,
        state => this.parseFormalPart(state),
        state => this.parseKeyword(state, '=>')),
      state => this.parseActualPart(state));
  }
  parseActualPart(state: ParserState): resultType {
    return this.chain(state,
      state => this.parseName(state),
      state => this.optionalChain(state,
        state => this.parseKeyword(state, '('),
        state => this.parseName(state),
        state => this.parseKeyword(state, ')')
      )) || this.parseKeyword(state, 'open');
  }
  parseFormalPart(state: ParserState): resultType {
    return this.chain(state,
      state => this.parseName(state, 'formalReference'),
      state => this.optionalChain(state,
        state => this.parseKeyword(state, '('),
        state => this.parseName(state),
        state => this.parseKeyword(state, ')')
      ));
  }
  parseSelectedName(state: ParserState): resultType {
    return this.chain(state,
      state => this.multiple(state, true,
        state => this.chain(state,
          state => this.parseName(state),
          state => this.parseKeyword(state, '.')
        )
      ),
      state => this.parseSuffix(state));
  }
  parseSuffix(state: ParserState): resultType {
    return this.parseSimpleName(state)
      || this.parseCharacterLiteral(state)
      || this.parseOperatorSymbol(state)
      || this.parseKeyword(state, 'all');
  }
  parseSimpleName(state: ParserState, as: 'reference' | 'formalReference' | 'attributeReference' = 'reference'): resultType {
    state = {
      num: state.num,
      type: 'simpleName',
      parent: state
    };
    const token = this.getNumToken(state);

    if (token?.isIdentifier()) {
      const name = token;
      state = this.increaseToken(state);
      let ref: OReference;
      if (as === 'reference') {
        ref = new OReference(this.parent, name);
      } else if (as === 'formalReference') {
        ref = new OFormalReference(this.parent, name);
      } else if (as === 'attributeReference') {
        if (state.parent?.reference === undefined) {
          throw new ParserError(`Attribute without referred name`, token.range);
        }
        ref = new OAttributeReference(this.parent, name, state.parent?.reference);
      } else {
        throw new ParserError(`internal error unexpected as '${as}'`, token.range);
      }
      state.reference = ref;
      return [[ref], state];
    }
    return false;
  }
  parseOperatorSymbol(state: ParserState): resultType {
    const token = this.getNumToken(state);

    if (token?.type === TokenType.stringLiteral) {
      // const name = token;
      state = this.increaseToken(state);
      return [[], state]; // Currently not handling operators
      // return [[new OReference(this.parent, name)], state];
    }
    return false;
  }
  parseCharacterLiteral(state: ParserState): resultType {
    const token = this.getNumToken(state);

    if (token?.type === TokenType.characterLiteral) {
      // const name = token;
      state = this.increaseToken(state);
      return [[], state]; // Currently not handling operators
      // return [[new OReference(this.parent, name)], state];
    }
    return false;
  }
  parseIndexedName(state: ParserState) {
    return this.chain(state,
      state => this.parsePrefix(state),
      state => this.parseKeyword(state, '('),
      state => this.parseExpression(state),
      state => this.multiple(state, false,
        state => this.chain(state,
          state => this.parseKeyword(state, '('),
          state => this.parseExpression(state)
        )
      ),
      state => this.parseKeyword(state, ')')
    );
  }
  parsePrefix(state: ParserState): resultType {
    return this.parseName(state);
  }
  parseLiteral(state: ParserState): resultType {
    if (this.getNumToken(state)?.isLiteral()) {
      state = this.increaseToken(state);
      return [[], state];
    }
    return false;
  }
  getNumToken(state: ParserState): OLexerToken | undefined {
    return this.tokens[state.num];
  }
  increaseToken(state: ParserState): ParserState {
    const newState = {
      ...state,
      num: state.num
    };
    do {
      newState.num++;
    } while (this.getNumToken(newState)?.isWhitespace());
    return newState;
  }
}