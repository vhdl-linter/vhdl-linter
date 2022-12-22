import { OLexerToken, TokenType } from "../lexer";
import { OAttributeReference, ObjectBase, OFormalReference, OReference, OSelectedName, ParserError, SelectedNamePrefix } from "./objects";
type resultType = false | [ParserState[], ParserState];
type ParserState = {
  num: number;
  token?: OLexerToken;
  type: 'expression' | 'root' | 'simpleName' | 'name' | 'logicalExpression'
  | 'relation' | 'shiftExpression' | 'simpleExpression' | 'term' | 'factor'
  | 'keyword' | 'primary' | 'allocator' | 'subtypeIndication' | 'formalPart'
  | 'actualPart' | 'associationElement'
  | 'attributeName' | 'selectedName';
  parent?: ParserState;
  children?: ParserState[];
  stackLength: number;
};
function* stateGenerator(startObject: ParserState): Generator<ParserState> {
  let current = startObject;
  while (true) {
    if (current.parent === undefined) {
      break;
    }
    current = current.parent;
    yield (current);
  }
}
function* stateGeneratorFiltered(startObject: ParserState): Generator<ParserState> {
  let braceLevel = 0;
  for (const stateIt of stateGenerator(startObject)) {
    if (stateIt.token?.getLText() === ')') {
      braceLevel++;
      continue;
    }
    if (stateIt.token?.getLText() === '(') {
      if (braceLevel > 0) {
        braceLevel--;
      } else {
        break;
      }
      continue;
    }
    if (braceLevel === 0) {
      const breakTypes: ParserState['type'][] = [
        'term',
        'logicalExpression',
        'relation',
        'shiftExpression',
        'simpleExpression',
        'factor'
      ];
      if (breakTypes.indexOf(stateIt.type) > -1  // Break prefix chain when operator comes
        || stateIt.token?.getLText() === ',' // Break prefix chain in association list
        || stateIt.token?.getLText() === '|' // Break prefix chain in choices
        || stateIt.token?.getLText() === '=>' // Break prefix chain in choices
      ) {
        break;
      }
      yield stateIt;

    }
  }
}


export class ExpressionParser {

  constructor(private parent: ObjectBase, private tokens: OLexerToken[]) {

  }
  private getTokenMergedRange() {
    return this.tokens[0].range.copyWithNewEnd(this.tokens[this.tokens.length - 1].range);
  }
  private debugState(state: ParserState) {
    let stateIt: ParserState | undefined = state;
    const nodes: string[] = [];
    do {
      nodes.push(`${stateIt.type} (${stateIt.token?.text})`);
      stateIt = stateIt.parent;
    } while (stateIt);
    return nodes.join(' -> ');
  }
  private isFormal(state: ParserState) {
    for (const stateIt of stateGeneratorFiltered(state)) {
      if (stateIt.type === 'formalPart') {
        return true;
      }
    }
    return false;
  }
  private isAttribute(state: ParserState) {
    for (const stateIt of stateGeneratorFiltered(state)) {
      if (stateIt.type === 'attributeName') {
        return true;
      }
    }
    return false;
  }
  private getPrefix(state: ParserState) {
    const prefix = [];
    let stateIt: ParserState | undefined = state;
    do {
      if (state.token) {
        prefix.push(state.token);
      }
      stateIt = stateIt.parent;
    } while (stateIt);
    return prefix;
  }
  private convertStateToReference(state: ParserState, previousReferences: OReference[]) {
    if (state.token && state.type === 'simpleName') {
      const prefix = [];
      for (const stateIt of stateGeneratorFiltered(state)) {
        if (stateIt.token && stateIt.type === 'simpleName') {
          prefix.push(stateIt.token);
        }
      }
      if (this.isFormal(state)) {
        return new OFormalReference(this.parent, state.token);
      } else if (this.isAttribute(state)) {
        let token: OLexerToken;
        for (const stateIt of stateGenerator(state)) {
          if (stateIt.type === 'simpleName') {
            token = (stateIt.token as OLexerToken);
            break;
          }
        }
        const ref = previousReferences.find(ref => ref.referenceToken === token);
        if (ref === undefined) {
          throw new ParserError('Could not find reference for attribute', state.token.range);
        }
        // const ref = references.find(ref => ref.lexerToken === )
        return new OAttributeReference(this.parent, state.token, ref);
      } else if (prefix.length > 0) {
        return new OSelectedName(this.parent, state.token, (prefix.reverse() as SelectedNamePrefix));
      } else {
        return new OReference(this.parent, state.token);

      }
    }
  }
  parse(): OReference[] {
    if (this.tokens.length === 0) {
      throw new ParserError('expression empty', this.parent.range);

    }
    const result = this.expression({ num: 0, type: 'root', stackLength: 0 });
    if (result) {
      if (result[1].num !== this.tokens.length) {
        throw new ParserError('expression parser not successful (remainder left)', this.getTokenMergedRange());
      }
      const references: OReference[] = [];
      for (const state of result[0]) {
        const ref = this.convertStateToReference(state, references);
        if (ref) {
          references.push(ref);
        }
      }
      return references;
    }
    throw new ParserError('expression parser not successful (no match)', this.getTokenMergedRange());

  }
  parseTarget(): OReference[] {
    if (this.tokens.length === 0) {
      throw new ParserError('expression empty', this.parent.range);
    }
    const result = this.parseName({ num: 0, type: 'root', stackLength: 0 }) || this.aggregate({ num: 0, type: 'root', stackLength: 0 });
    if (result) {
      if (result[1].num !== this.tokens.length) {
        throw new ParserError('expression parseTarget not successful (remainder left)', this.getTokenMergedRange());
      }
      const references: OReference[] = [];
      for (const state of result[0]) {
        const ref = this.convertStateToReference(state, references);
        if (ref) {
          references.push(ref);
        }
      }
      return references;
    }
    throw new ParserError('expression parseTarget not successful (no match)', this.getTokenMergedRange());
  }
  parseAssociationElement() {
    if (this.tokens.length === 0) {
      throw new ParserError('expression empty', this.parent.range);
    }
    const result = this.associationElement({ num: 0, type: 'root', stackLength: 0 });
    if (result) {
      if (result[1].num !== this.tokens.length) {
        throw new ParserError('expression parseAssociationElement not successful (remainder left)', this.getTokenMergedRange());
      }
      const references: OReference[] = [];
      for (const state of result[0]) {
        const ref = this.convertStateToReference(state, references);
        if (ref) {
          references.push(ref);
        }
      }
      return references;
    }
    throw new ParserError('expression parseAssociationElement not successful (no match)', this.getTokenMergedRange());
  }
  private pushState(state: ParserState, type: ParserState['type']) {
    const newState: ParserState = {
      num: state.num,
      type,
      stackLength: state.stackLength + 1
    };
    if (newState.stackLength > 300) {
      throw new ParserError(`Parser stack overflow ${this.debugState(state)}`, this.getTokenMergedRange());
    }
    newState.parent = {
      ...state,
      children: [...state.children ?? [], newState]
    };
    return newState;
  }
  private expression(state: ParserState): resultType {
    state = this.pushState(state, 'expression');
    return this.alternatives(state,
      state => this.chain(state,
        state => this.keyword(state, '??'),
        state => this.primary(state)),
      state => this.logicalExpression(state)
    );
  }
  // This gets the current Text (for Debugger)
  private getTextDebug(state: ParserState) {
    return this.tokens.slice(state.num, state.num + 5).join(' ');

  }

  private logicalExpression(state: ParserState) {
    state = this.pushState(state, 'logicalExpression');
    return this.alternatives(state,
      state => this.chain(state,
        state => this.relation(state),
        state => this.multiple(state, true,
          state => this.chain(state,
            state => this.keyword(state, 'and'),
            state => this.relation(state)
          )
        )
      ),
      state => this.chain(state,
        state => this.relation(state),
        state => this.multiple(state, true,
          state => this.chain(state,
            state => this.keyword(state, 'or'),
            state => this.relation(state)
          )
        )
      ),
      state => this.chain(state,
        state => this.relation(state),
        state => this.multiple(state, true,
          state => this.chain(state,
            state => this.keyword(state, 'xor'),
            state => this.relation(state)
          )
        )
      ),
      state => this.chain(state,
        state => this.relation(state),
        state => this.multiple(state, true,
          state => this.chain(state,
            state => this.keyword(state, 'xnor'),
            state => this.relation(state)
          )
        )
      ),
      state => this.chain(state,
        state => this.relation(state),
        state => this.optional(state,
          state => this.chain(state,
            state => this.keyword(state, 'nand', 'nor'),
            state => this.relation(state)
          )
        )
      )
    );
  }
  private relation(state: ParserState) {
    state = this.pushState(state, 'relation');
    return this.chain(state,
      state => this.shiftExpression(state),
      state => this.optionalChain(state,
        state => this.keyword(state, '=', '/=', '<', '<=', '>', '>=', '?=', '?/=', '? ', '?<=', '?>', '?>='),
        state => this.shiftExpression(state)
      )
    );

  }
  private shiftExpression(state: ParserState) {
    state = this.pushState(state, 'shiftExpression');

    return this.chain(state,
      state => this.simpleExpression(state),
      state => this.optionalChain(state,
        state => this.keyword(state, 'sll', 'srl', 'sla', 'sra', 'rol', 'ror'),
        state => this.simpleExpression(state)
      )
    );
  }
  private simpleExpression(state: ParserState): resultType {
    state = this.pushState(state, 'simpleExpression');

    return this.chain(state,
      state => this.optional(state,
        state => this.keyword(state, '+', '-')
      ),
      state => this.term(state),
      state => this.multiple(state, false,
        state => this.chain(state,
          state => this.keyword(state, '+', '-', '&'),
          state => this.term(state)
        )
      )
    );
  }
  private term(state: ParserState): resultType {
    state = this.pushState(state, 'term');

    return this.chain(state,
      state => this.factor(state),
      state => this.multiple(state, false,
        state => this.chain(state,
          state => this.keyword(state, '*', '/', 'mod', 'rem'),
          state => this.factor(state)
        )
      )
    );

  }
  private factor(state: ParserState): resultType {
    state = this.pushState(state, 'factor');

    return this.alternatives(state,
      state => this.chain(state,
        state => this.primary(state),
        state => this.optionalChain(state,
          state => this.keyword(state, '**'),
          state => this.primary(state)

        )
      ),
      state => this.chain(state,
        state => this.keyword(state, 'abs', 'not', 'and', 'or', 'nand', 'nor', 'xor', 'xnor'),
        state => this.primary(state))
    );
  }
  private keyword(state: ParserState, ...keywords: string[]): resultType {
    state = this.pushState(state, 'keyword');
    if (keywords.indexOf(this.getNumToken(state)?.getLText() ?? '') === -1) {
      return false;
    }
    state.token = this.getNumToken(state);
    state = this.increaseToken(state);
    return [[], state];
  }
  private chain(state: ParserState, ...links: ((state: ParserState) => resultType)[]): resultType {
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
  private optional(state: ParserState, inner: (state: ParserState) => resultType): resultType {
    const result = inner(state);
    if (result) {
      return result;
    }
    return [[], state];
  }
  private optionalChain(state: ParserState, ...links: ((state: ParserState) => resultType)[]): resultType {
    return this.optional(state,
      state => this.chain(state,
        ...links
      )
    );
  }
  private primary(state: ParserState) {
    state = this.pushState(state, 'primary');

    return this.qualifiedExpression(state)
      || this.allocator(state)
      || this.parseName(state)
      || this.parseLiteral(state)
      || this.aggregate(state)
      //function call

      ;
  }
  private allocator(state: ParserState): resultType {
    state = this.pushState(state, 'allocator');

    return this.chain(state,
      state => this.keyword(state, 'new'),
      state => this.alternatives(state,
        state => this.qualifiedExpression(state),
        state => this.subtypeIndication(state),
      )
    );
  }
  private subtypeIndication(state: ParserState): resultType {
    state = this.pushState(state, 'subtypeIndication');

    return this.chain(state,
      //resolution_indication
      state => this.parseName(state),
      state => this.optional(state,
        state => this.constraint(state)
      )
    );

  }
  private constraint(state: ParserState): resultType {
    return this.rangeConstraint(state);
    // | array_constraint
    //  | record_constraint
  }
  private rangeConstraint(state: ParserState): resultType {
    return this.chain(state,
      state => this.keyword(state, 'range'),
      state => this.parseRange(state));
  }
  private qualifiedExpression(state: ParserState): resultType {
    return this.chain(state,
      state => this.parseName(state),
      state => this.keyword(state, '\''),
      state => this.aggregate(state)
    );
  }
  private alternatives(state: ParserState, ...alternatives: ((state: ParserState) => resultType)[]) {
    let result;
    for (const alternative of alternatives) {
      result = alternative(state);
      if (result) {
        return result;
      }
    }
    return false;
  }
  private multiple(state: ParserState, minimumOne: boolean, inner: (state: ParserState) => resultType): resultType {
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
  private multipleChain(state: ParserState, minimumOne: boolean, ...links: ((state: ParserState) => resultType)[]): resultType {
    return this.multiple(state, minimumOne,
      state => this.chain(state,
        ...links
      )
    );
  }


  private aggregate(state: ParserState): resultType {
    return this.chain(state,
      state => this.keyword(state, '('),
      state => this.elementAssociation(state),
      state => this.multiple(state, false,
        state => this.chain(state,
          state => this.keyword(state, ','),
          state => this.elementAssociation(state))),
      state => this.keyword(state, ')')
    );
  }
  private elementAssociation(state: ParserState): resultType {
    return this.chain(state,
      state => this.optional(state,
        state => this.chain(state,
          state => this.parseChoices(state),
          state => this.keyword(state, '=>')
        ),
      ),
      state => this.expression(state)
    );
  }
  private parseChoices(state: ParserState): resultType {
    return this.chain(state,
      state => this.parseChoice(state),
      state => this.multipleChain(state, false,
        state => this.keyword(state, '|'),
        state => this.parseChoice(state)
      )
    );
  }
  private parseChoice(state: ParserState): resultType {
    return this.alternatives(state,
      state => this.parseDiscreteRange(state),
      state => this.simpleExpression(state),
      // element simple name // Should be part of simple expression
      state => this.keyword(state, 'others')
    );
  }
  private parseName(state: ParserState): resultType {
    state = this.pushState(state, 'name');

    return this.chain(state,
      state => this.alternatives(state,
        state => this.simpleName(state),
        state => this.operatorSymbol(state),
        state => this.parseCharacterLiteral(state),
        // state => this.parseIndexedName(state),
        // state => this.parseAttributeName(state),
        //external name
      ),
      state => this.multiple(state, false,
        state => this.alternatives(state,
          state => this.chain(state,
            state => this.keyword(state, '.'),
            state => this.suffix(state)
          ),
          state => this.chain(state,
            state => this.keyword(state, '('),
            state => this.associationList(state),
            state => this.keyword(state, ')'),
          ),
          state => this.chain(state,
            state => this.keyword(state, '('),
            state => this.parseDiscreteRange(state),
            state => this.keyword(state, ')'),
          ),
          state => this.chain(state,
            state => this.keyword(state, '('),
            state => this.expression(state),
            state => this.multipleChain(state, false,
              state => this.keyword(state, ','),
              state => this.expression(state)
            ),
            state => this.keyword(state, ')')
          ),
          state => this.chain(state,
            state => this.keyword(state, '\''),
            state => this.simpleName(this.pushState(state, 'attributeName')),
            state => this.optionalChain(state,
              state => this.keyword(state, '('),
              state => this.expression(state),
              state => this.keyword(state, ')'),
            )
          )
        ),
      )
    );


  }
  private parseDiscreteRange(state: ParserState): resultType {
    return this.alternatives(state,
      state => this.parseRange(state),
      state => this.subtypeIndication(state)
    );
  }
  private parseRange(state: ParserState): resultType {
    // attribute_name
    return this.chain(state,
      state => this.simpleExpression(state),
      state => this.keyword(state, 'to', 'downto'),
      state => this.simpleExpression(state),

    );

  }

  private associationList(state: ParserState): resultType {
    return this.chain(state,
      state => this.associationElement(state),
      state => this.multipleChain(state, false,
        state => this.keyword(state, ','),
        state => this.associationElement(state)
      )
    );
  }
  private associationElement(state: ParserState): resultType {
    state = this.pushState(state, 'associationElement');

    return this.chain(state,
      state => this.optionalChain(state,
        state => this.formalPart(state),
        state => this.keyword(state, '=>')),
      state => this.actualPart(state));
  }
  private actualPart(state: ParserState): resultType {
    state = this.pushState(state, 'actualPart');

    return this.expression(state) || this.chain(state,
      state => this.parseName(state),
      state => this.optionalChain(state,
        state => this.keyword(state, '('),
        state => this.parseName(state),
        state => this.keyword(state, ')')
      )) || this.keyword(state, 'open');
  }
  private formalPart(state: ParserState): resultType {
    state = this.pushState(state, 'formalPart');

    return this.chain(state,
      state => this.parseName(state),
      state => this.optionalChain(state,
        state => this.keyword(state, '('),
        state => this.parseName(state),
        state => this.keyword(state, ')')
      ));
  }
  private suffix(state: ParserState): resultType {
    return this.simpleName(state)
      || this.parseCharacterLiteral(state)
      || this.operatorSymbol(state)
      || this.keyword(state, 'all');
  }
  private simpleName(state: ParserState): resultType {
    state = this.pushState(state, 'simpleName');
    const token = this.getNumToken(state);

    if (token?.isIdentifier()) {
      const name = token;
      state = this.increaseToken(state);
      // let ref: OReference;
      // if (as === 'reference') {
      //   ref = new OReference(this.parent, name);
      // } else if (as === 'formalReference') {
      //   ref = new OFormalReference(this.parent, name);
      // } else if (as === 'attributeReference') {
      //   if (state.parent?.reference === undefined) {
      //     throw new ParserError(`Attribute without referred name`, token.range);
      //   }
      //   ref = new OAttributeReference(this.parent, name, state.parent?.reference);
      // } else {
      //   throw new ParserError(`internal error unexpected as '${as}'`, token.range);
      // }
      state.token = name;
      return [[state], state];
    }
    return false;
  }
  private operatorSymbol(state: ParserState): resultType {
    const token = this.getNumToken(state);

    if (token?.type === TokenType.stringLiteral) {
      // const name = token;
      state = this.increaseToken(state);
      return [[], state]; // Currently not handling operators
      // return [[new OReference(this.parent, name)], state];
    }
    return false;
  }
  private parseCharacterLiteral(state: ParserState): resultType {
    const token = this.getNumToken(state);

    if (token?.type === TokenType.characterLiteral) {
      // const name = token;
      state = this.increaseToken(state);
      return [[], state]; // Currently not handling operators
      // return [[new OReference(this.parent, name)], state];
    }
    return false;
  }
  private parseIndexedName(state: ParserState) {
    return this.chain(state,
      state => this.parsePrefix(state),
      state => this.keyword(state, '('),
      state => this.expression(state),
      state => this.multiple(state, false,
        state => this.chain(state,
          state => this.keyword(state, '('),
          state => this.expression(state)
        )
      ),
      state => this.keyword(state, ')')
    );
  }
  private parsePrefix(state: ParserState): resultType {
    return this.parseName(state);
  }
  private parseAbstractLiteral(state: ParserState): resultType {
    if (this.getNumToken(state)?.isLiteral()) {
      state = this.increaseToken(state);
      return [[], state];
    }
    return false;

  }
  private parseLiteral(state: ParserState): resultType {
    return this.chain(state,
      state => this.parseAbstractLiteral(state),
      state => this.optional(state,
        state => this.parseName(state)
      )
    );
  }
  private getNumToken(state: ParserState): OLexerToken | undefined {
    return this.tokens[state.num];
  }
  private increaseToken(state: ParserState): ParserState {
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