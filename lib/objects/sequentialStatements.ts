import * as I from '../parser/interfaces';
import * as O from './objectsIndex';

export type OSequentialStatement = (OCase | OAssignment | OIf | OLoop | OInstantiation | OReport | OAssertion | OExit) & I.IMayHaveLabel;
export class OIf extends ObjectBase implements I.IMayHaveLabel {
  clauses: OIfClause[] = [];
  else?: OElseClause;
  label?: OLexerToken;
  labelLinks: OLabelName[];
}
export class OElseClause extends OSequenceOfStatements {
}
export class OIfClause extends OSequenceOfStatements {
  condition: OName[] = [];
}
export class OCase extends ObjectBase implements I.IMayHaveLabel {
  expression: OName[] = [];
  whenClauses: OWhenClause[] = [];
  label?: OLexerToken;
  labelLinks: OLabelName[] = [];
}
export class OWhenClause extends OSequenceOfStatements {
  condition: OName[] = [];
  whenTokens: OLexerToken[] = [];
}
export class OLoop extends OSequenceOfStatements {
}
export class OForLoop extends OLoop implements I.IHasDeclarations {
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  constantRange: OName[] = [];
}
export class OWhileLoop extends OLoop {
  condition: OName[] = [];
}
export class OAssignment extends ObjectBase implements I.IMayHaveLabel, I.IHasPostponed {
  label?: OLexerToken;
  labelLinks: OLabelName[] = [];
  names: OName[] = [];
  postponed = false;
  guarded = false;
}
export class OExit extends ObjectBase implements I.IMayHaveLabel {
  label?: OLexerToken;
  labelLinks: OLabelName[] = [];
  names: OName[] = [];
  labelName?: OLabelName;
}
export class ONext extends ObjectBase implements I.IMayHaveLabel {
  label?: OLexerToken;
  labelLinks: OLabelName[] = [];
  names: OName[] = [];
  labelName?: OLabelName;
}

export class OReport extends ObjectBase implements I.IMayHaveLabel {
  names: OName[] = [];
  label?: OLexerToken;
  labelLinks: OLabelName[] = [];
}
export class OReturn extends ObjectBase implements I.IMayHaveLabel {
  names: OName[] = [];
  label?: OLexerToken;
  labelLinks: OLabelName[] = [];
}
export class OAssertion extends ObjectBase implements I.IMayHaveLabel {
  name: OName[] = [];
  label?: OLexerToken;
  labelLinks: OLabelName[] = [];
  postponed: boolean;
}