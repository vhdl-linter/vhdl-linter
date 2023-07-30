import { OLexerToken } from '../lexer';
import * as I from '../parser/interfaces';
import { ODeclaration, OAlias } from './declarations';
import { OStatementBody, OArchitecture, OPackage, OUseClause } from './designEntites';
import { OInstantiation } from './instantiations';
import { OIRange, ObjectBase, OFile } from './linterObjects';
import { OLabelName, OName } from './name';
import { OAssignment, OAssertion, OSequentialStatement } from './sequentialStatements';
export type OConcurrentStatements = OProcess | OInstantiation | OIfGenerate | OForGenerate | OCaseGenerate | OBlock | OAssignment | OAssertion;

export class OForGenerate extends OStatementBody implements I.IHasLabel {
  lexerToken: undefined;
  label: OLexerToken;
  iterationConstant: OLexerToken;
  iterationRangeTokens: OLexerToken[];
  labelLinks: OLabelName[] = [];
  constructor(public parent: OArchitecture,
    range: OIRange,
    public variableRange: OName[],
  ) {
    super(parent, range);
  }
}
export class OCaseGenerate extends ObjectBase implements I.IHasLabel {
  expression: OName[] = [];
  expressionTokens: OLexerToken[] = [];
  whenGenerateClauses: OWhenGenerateClause[] = [];
  label: OLexerToken;
  labelLinks: OLabelName[] = [];
  lexerToken: undefined;
}
export class OWhenGenerateClause extends OStatementBody implements I.IMayHaveLabel {
  lexerToken: undefined;
  label?: OLexerToken;
  labelLinks: OLabelName[] = [];
  condition: OName[] = [];
  conditionTokens: OLexerToken[] = [];
  public parent: OCaseGenerate;
}
export class OIfGenerate extends ObjectBase implements I.IHasLabel {
  constructor(public parent: ObjectBase | OFile, public range: OIRange, public label: OLexerToken) {
    super(parent, range);
  }
  ifGenerateClauses: OIfGenerateClause[] = [];
  elseGenerateClause?: OElseGenerateClause;
  labelLinks: OLabelName[] = [];
  lexerToken: undefined;
}
export class OIfGenerateClause extends OStatementBody implements I.IMayHaveLabel {
  label?: OLexerToken;
  labelLinks: OLabelName[] = [];
  lexerToken: undefined;
  condition: OName[] = [];
  conditionTokens: OLexerToken[] = [];
  public parent: OIfGenerate;
}
export class OElseGenerateClause extends OStatementBody implements I.IMayHaveLabel {
  label?: OLexerToken;
  labelLinks: OLabelName[] = [];

  lexerToken: undefined;
  public parent: OIfGenerate;

}
export class OBlock extends OStatementBody implements I.IHasLabel {
  label: OLexerToken;
  labelLinks: OLabelName[] = [];
  lexerToken: undefined;
  guardCondition?: OName[];
}
export class OSequenceOfStatements extends ObjectBase implements I.IMayHaveLabel, I.IHasStatements {
  statements: OSequentialStatement[] = [];
  statementsRange: OIRange;
  labelLinks: OLabelName[] = [];
  label?: OLexerToken;
}

export class OProcess extends OSequenceOfStatements implements I.IHasDeclarations, I.IHasStatements,
  I.IHasUseClauses, I.IHasPostponed {
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  label?: OLexerToken;
  postponed = false;
  aliases: OAlias[] = [];
  packageDefinitions: OPackage[] = [];
  useClauses: OUseClause[] = [];
  sensitivityList: OName[] = [];
  labelLinks: OLabelName[] = [];

}
