import { Position, Range, TextEdit } from 'vscode-languageserver';
import { OLexerToken } from '../lexer';
import { OIDiagnosticWithSolution } from '../vhdlLinter';
import * as I from './interfaces';
import { URL } from 'url';

export class OI implements Position {
  protected i_?: number;
  constructor(public parent: ObjectBase | OFile, i: number, j?: number, k?: number) {
    if (j === Number.POSITIVE_INFINITY) {
      const lines = (this.parent instanceof OFile ? this.parent : this.parent.rootFile).lines;
      j = lines[i]!.length - 1;
    }
    if (k !== undefined && j !== undefined) {
      this.i_ = k;
      this.position = {
        line: i,
        character: j
      };
    } else if (typeof j === 'undefined') {
      this.i_ = i;
    } else {
      this.position = {
        line: i,
        character: j,
      };
    }
  }
  get i() {
    if (this.i_ === undefined) {
      this.calcI();
      if (this.i_ === undefined) {
        throw new Error('Can not convert position to i');
      }
    }
    return this.i_;
  }
  private position?: Position;
  get line() {
    if (!this.position) {
      this.position = this.calcPosition();
    }
    return this.position.line;
  }
  toJSON() {
    if (!this.position) {
      this.position = this.calcPosition();
    }
    return this.position;
  }
  get character() {
    if (!this.position) {
      this.position = this.calcPosition();
    }
    return this.position.character;
  }

  getRangeToEndLine(): OIRange {
    const start = this.i;
    const text = this.parent.rootFile.text;
    let end = text.length;
    const match = /\n/.exec(text.substr(start));
    if (match) {
      end = start + match.index;
    }
    return new OIRange(this.parent, start, end);

  }
  private calcPosition(): Position {
    const lines = (this.parent instanceof OFile ? this.parent : this.parent.rootFile).text.slice(0, this.i).split('\n');
    const line = lines.length - 1;
    const character = lines[lines.length - 1]!.length;
    return { character, line };
  }
  private calcI() {
    if (typeof this.position === 'undefined') {
      throw new Error('Something went wrong with OIRange');
    }
    const lines = (this.parent instanceof OFile ? this.parent : this.parent.rootFile).lines;
    this.i_ = lines.slice(0, this.position.line).join('\n').length + 1 + Math.min(this.position.character, lines[this.position.line]!.length);
  }
}

export class OIRange implements Range {

  public readonly start: OI;
  public readonly end: OI;
  constructor(public parent: ObjectBase | OFile, start: number | OI, end: number | OI) {
    if (start instanceof OI) {
      this.start = start;
    } else {
      this.start = new OI(parent, start);
    }
    if (end instanceof OI) {
      this.end = end;
    } else {
      this.end = new OI(parent, end);
    }
  }
  getText() {
    return this.parent.rootFile.text.substring(this.start.i, this.end.i);
  }
  copyWithNewEnd(newEnd: OI | number | OIRange) {
    if (newEnd instanceof OIRange) {
      newEnd = newEnd.end;
    }
    return new OIRange(this.parent, this.start, newEnd);
  }
  copyWithNewStart(newStart: OI | number | OIRange) {
    if (newStart instanceof OIRange) {
      newStart = newStart.start;
    }
    return new OIRange(this.parent, newStart, this.end);
  }

  toJSON() {
    return Range.create(this.start, this.end);
  }
  getLimitedRange(limit = 5, fromEnd = false) {
    if (fromEnd) {
      const newStart = this.end.line - this.start.line > limit ?
        new OI(this.parent, this.end.line - limit, 0)
        : this.start;
      return new OIRange(this.parent, newStart, this.end);
    } else {
      const newEnd = this.end.line - this.start.line > limit ?
        new OI(this.parent, this.start.line + limit, Number.POSITIVE_INFINITY)
        : this.end;
      return new OIRange(this.parent, this.start, newEnd);
    }
  }
  copyExtendBeginningOfLine() {
    const lines = (this.parent instanceof OFile ? this.parent : this.parent.rootFile).lines;
    let startCol = 0;
    const match = lines[this.start.line]?.match(/\S/);
    if (match) {
      startCol = match.index ?? 0;
    }
    const newStart = new OI(this.parent, this.start.line, startCol);

    return new OIRange(this.parent, newStart, this.end);

  }
  copyExtendEndOfLine(): OIRange {
    const text = this.parent.rootFile.text;
    const match = /\n/.exec(text.substr(this.start.i));
    let end = text.length;
    if (match) {
      end = this.start.i + match.index;
    }
    return new OIRange(this.parent, this.start.i, end);
  }
}


type ORootElements = OArchitecture | OEntity | OPackage | OPackageInstantiation | OPackageBody | OContext | OConfigurationDeclaration;

export class ObjectBase {
  lexerToken?: OLexerToken;
  readonly rootFile: OFile;
  constructor(public parent: ObjectBase | OFile, public range: OIRange) {
    let maximumIterationCounter = 5000;
    let p = parent;
    while (!(p instanceof OFile)) {
      p = p.parent;
      maximumIterationCounter--;
      if (maximumIterationCounter === 0) {
        throw new ParserError('Maximum Iteration Counter overrun', range);
      }
    }
    this.rootFile = p;
    p.objectList.push(this);
  }
  private rootElement?: ORootElements;

  getRootElement(): ORootElements {
    if (this.rootElement) {
      return this.rootElement;
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let parent: ObjectBase = this;
    while (parent instanceof OArchitecture === false
      && parent instanceof OEntity === false
      && parent instanceof OPackage === false
      && parent instanceof OPackageInstantiation === false
      && parent instanceof OPackageBody === false
      && parent instanceof OContext === false
      && parent instanceof OConfigurationDeclaration === false) {
      if (parent.parent instanceof OFile) {
        throw new ParserError('Failed to find root element', this.range);
      }
      parent = parent.parent;
    }
    this.rootElement = parent as ORootElements;
    return this.rootElement;
  }
  lexerTokenEquals(other: ObjectBase) {
    return this.lexerToken?.text.toLowerCase() === other.lexerToken?.text.toLowerCase();
  }
}




export abstract class OGeneric extends ObjectBase implements I.IHasDefinitions, I.IHasNameLinks {
  parent: OEntity | OPackage;
  definitions: (OGeneric | OPackage)[] = [];
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];
  lexerToken: OLexerToken;
  defaultValue?: ObjectBase[];
}
export class OGenericConstant extends OGeneric implements I.IVariableBase, I.IHasSubtypeIndication, I.IHasDefaultValue {
  definitions: OGenericConstant[] = [];
  subtypeIndication: OSubtypeIndication;
  defaultValue?: OName[];

}
export class OName extends ObjectBase implements I.IHasDefinitions, I.IHasNameToken {
  constructor(public parent: ObjectBase | OFile, public nameToken: OLexerToken, public write = false, range?: OIRange) {
    super(parent, range ?? nameToken.range);
  }
  definitions: ObjectBase[] = [];
  notDeclaredHint?: string;
  lexerToken: undefined;
  constraint = false;
  // Workaround for checking of OWrites in associations. Because of overloading they can not be correctly checked.
  // This avoids false positives
  public inAssociation = false;
  children: OName[][] = [];
  // OName was found in expression after a comma. is used in elaborate to split different actuals when an OName is converted to an OInstantiation
  afterComma = false;
  maybeFormal = false;
  functionInFormalException = false;
  toString() {
    return this.nameToken.text;
  }
}
export class OAggregate extends OName {

}
export class OChoice extends OName {
}
export class OExternalName extends OName {
  subtypeIndication: OSubtypeIndication;
  constructor(public parent: ObjectBase, public path: [OLexerToken], public kind: OLexerToken, range: OIRange) {
    super(parent, path[0], false, range);
  }
}
export class OLabelName extends OName {
}
export class OFormalName extends OName {
}
export class OFile {
  parserMessages: OIDiagnosticWithSolution[] = [];
  public lines: string[];
  constructor(public text: string, public uri: URL, public originalText: string, public lexerTokens: OLexerToken[]) {
    this.lines = originalText.split('\n');
  }

  objectList: ObjectBase[] = [];
  contexts: OContext[] = [];
  magicComments: (OMagicCommentDisable)[] = [];
  entities: OEntity[] = [];
  architectures: OArchitecture[] = [];
  packages: (OPackage | OPackageBody)[] = [];
  packageInstantiations: OPackageInstantiation[] = [];
  configurations: OConfigurationDeclaration[] = [];
  targetLibrary?: string;
  readonly rootFile = this; // Provided as a convenience to equalize to ObjectBase
}

export class OInterfacePackage extends OGeneric implements I.IHasNameLinks, I.IHasUseClauses, I.IHasContextReference, I.IHasLibraries,
  I.IHasLexerToken, I.IMayHaveGenericAssociationList {
  aliasLinks: OAlias[] = [];
  lexerToken: OLexerToken;
  uninstantiatedPackage: OName[] = [];
  genericAssociationList?: OGenericAssociationList;
  nameLinks: OName[] = [];
  libraries: OLibrary[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
  box: boolean;

}
export class OPackageInstantiation extends ObjectBase implements I.IHasDefinitions, I.IHasNameLinks,
  I.IHasUseClauses, I.IHasContextReference, I.IHasLibraries, I.IMayHaveGenericAssociationList, I.IHasLexerToken {
  definitions: OPackage[] = [];
  aliasLinks: OAlias[] = [];
  lexerToken: OLexerToken;
  uninstantiatedPackage: OName[] = [];
  genericAssociationList?: OGenericAssociationList;
  nameLinks: OName[] = [];
  libraries: OLibrary[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
}

export class OPackage extends ObjectBase implements I.IHasDeclarations, I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken,
  I.IHasLibraries, I.IHasGenerics, I.IHasNameLinks, I.IMayHaveEndingLexerToken, I.IHasGenerics {
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  parent: OFile;
  libraries: OLibrary[] = [];
  generics: OGeneric[] = [];
  genericRange?: OIRange;
  lexerToken: OLexerToken;
  useClauses: OUseClause[] = [];
  contextReferences: OContextReference[] = [];
  endingLexerToken?: OLexerToken;
  correspondingPackageBodies: OPackageBody[] = [];
}

export class OPackageBody extends ObjectBase implements I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken, I.IHasLibraries,
  I.IHasNameLinks, I.IMayHaveEndingLexerToken, I.IHasDeclarations {
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];
  lexerToken: OLexerToken;
  libraries: OLibrary[] = [];
  packageDefinitions: OPackage[] = [];
  useClauses: OUseClause[] = [];
  contextReferences: OContextReference[] = [];
  parent: OFile;
  correspondingPackage?: OPackage;
  endingLexerToken?: OLexerToken;
}


export class OLibrary extends ObjectBase implements I.IHasLexerToken, I.IHasNameLinks {
  constructor(public parent: ObjectBase | OFile, public lexerToken: OLexerToken) {
    super(parent, lexerToken.range);
  }
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];
}

export class OContextReference extends ObjectBase {
  constructor(public parent: OContext | ObjectBase | OFile, range: OIRange) {
    super(parent, range);
  }
  names: OName[];
  toString() { // Shows nicer info on debug
    return this.names.map(name => name.nameToken.text).join('.');
  }
}

export class OContext extends ObjectBase implements I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken, I.IHasLibraries {
  parent: OFile;
  lexerToken: OLexerToken;
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
  libraries: OLibrary[] = [];
}
export type OConcurrentStatements = OProcess | OInstantiation | OIfGenerate | OForGenerate | OCaseGenerate | OBlock | OAssignment | OAssertion;
// ODeclaration also includes specifications
export type ODeclaration = OSignal | OAttributeSpecification | OAttributeDeclaration | OVariable | OConstant | OFileVariable | OType
  | OAlias | OSubprogram | OComponent | OPackageInstantiation | OConfigurationSpecification | OPackage | OPackageBody;

export abstract class OStatementBody extends ObjectBase implements I.IHasDeclarations,
  I.IHasUseClauses, I.IHasContextReference, I.IHasLibraries, I.IHasNameLinks, I.IHasStatements {
  nameLinks: OName[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  aliasLinks: OAlias[] = [];
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  contextReferences: OContextReference[] = [];
  libraries: OLibrary[] = [];
  statements: OConcurrentStatements[] = [];
  statementsRange: OIRange;
  correspondingEntity?: OEntity;
}
export class OArchitecture extends OStatementBody implements I.IHasLexerToken, I.IMayHaveEndingLexerToken {
  lexerToken: OLexerToken;
  entityName: OLexerToken;
  declarationsRange: OIRange;
  endingLexerToken?: OLexerToken;
}
export class OBlock extends OStatementBody implements I.IHasLabel {
  label: OLexerToken;
  labelLinks: OLabelName[] = [];
  lexerToken: undefined;
  guardCondition?: OName[];
}
export class OUnit extends ObjectBase implements I.IHasNameLinks, I.IHasLexerToken {
  constructor(parent: OType, public lexerToken: OLexerToken) {
    super(parent, lexerToken.range);
  }
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];

}
export class OType extends ObjectBase implements I.IHasNameLinks,
  I.IHasUseClauses, I.IHasLexerToken, I.IHasDeclarations {
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  incomplete = false;
  aliasLinks: OAlias[] = [];
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  nameLinks: OName[] = [];
  units: OUnit[] = [];
  alias = false;
  lexerToken: OLexerToken;
  protected = false;
  protectedBody = false;
}
export class OAccessType extends OType implements I.IHasSubtypeIndication {
  subtypeIndication: OSubtypeIndication;
}
export class OFileType extends OType implements I.IHasSubtypeIndication {
  subtypeIndication: OSubtypeIndication;

}
export class OSubType extends OType implements I.IHasSubtypeIndication {
  subtypeIndication: OSubtypeIndication;

}
export class OSubtypeIndication extends ObjectBase {
  resolutionIndication: OName[] = [];
  typeNames: OName[] = [];
  constraint: OName[] = [];
}
export class OEnum extends OType {
  literals: OEnumLiteral[] = [];
}
export class ORecord extends OType implements I.IMayHaveEndingLexerToken {
  children: ORecordChild[] = [];
  endingLexerToken?: OLexerToken;
}
export class OArray extends OType implements I.IHasSubtypeIndication {
  indexNames: OName[] = [];
  subtypeIndication: OSubtypeIndication;

}
export class ORecordChild extends OType implements I.IHasSubtypeIndication {
  public parent: ORecord;
  subtypeIndication: OSubtypeIndication;

}
export class OEnumLiteral extends ObjectBase implements I.IHasNameLinks, I.IHasLexerToken {
  nameLinks: OName[] = [];
  public parent: OEnum;
  public lexerToken: OLexerToken;
  aliasLinks: OAlias[] = [];

}
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



export class OFileVariable extends ObjectBase implements I.IVariableBase {
  aliasLinks: OAlias[] = [];

  nameLinks: OName[] = [];
  subtypeIndication: OSubtypeIndication;
  defaultValue?: OName[] = [];
  lexerToken: OLexerToken;
  openKind?: OName[];
  logicalName?: OName[];
  constructor(parent: I.IHasDeclarations, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OVariable extends ObjectBase implements I.IVariableBase {
  nameLinks: OName[] = [];
  subtypeIndication: OSubtypeIndication;
  defaultValue?: OName[] = [];
  lexerToken: OLexerToken;
  aliasLinks: OAlias[] = [];
  shared = false;
  constructor(parent: I.IHasDeclarations, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OSignal extends ObjectBase implements I.IVariableBase {
  nameLinks: OName[] = [];
  subtypeIndication: OSubtypeIndication;
  defaultValue?: OName[] = [];
  lexerToken: OLexerToken;
  aliasLinks: OAlias[] = [];
  registerProcess?: OProcess;
  constructor(parent: (ObjectBase & I.IHasDeclarations), range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OConstant extends ObjectBase implements I.IVariableBase {
  nameLinks: OName[] = [];
  subtypeIndication: OSubtypeIndication;
  defaultValue?: OName[] = [];
  lexerToken: OLexerToken;
  aliasLinks: OAlias[] = [];

  constructor(parent: I.IHasDeclarations, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OAssociationList extends ObjectBase {
  constructor(public parent: OInstantiation | OPackage | OPackageInstantiation | OInterfacePackage, range: OIRange) {
    super(parent, range);
  }
  public children: OAssociation[] = [];

}
export class OGenericAssociationList extends OAssociationList {
  constructor(public parent: OInstantiation | OPackageInstantiation | OInterfacePackage, range: OIRange) {
    super(parent, range);
  }
}
export class OPortAssociationList extends OAssociationList {
  constructor(public parent: OInstantiation, range: OIRange) {
    super(parent, range);
  }
}

export class OInstantiation extends OName implements I.IHasDefinitions, I.IMayHaveLabel, I.IHasPostponed {
  constructor(public parent: OStatementBody | OEntity | OProcess | OLoop | OIf, lexerToken: OLexerToken, public type: 'entity' | 'component' | 'configuration' | 'subprogram' | 'unknown' = 'unknown') {
    super(parent, lexerToken);
  }
  postponed = false;
  definitions: (OEntity | OSubprogram | OComponent | OAliasWithSignature | OConfigurationDeclaration)[] = [];
  instantiatedUnit: [OName, ...OSelectedName[]];
  package?: OLexerToken;
  portAssociationList?: OPortAssociationList;
  genericAssociationList?: OGenericAssociationList;

  archIdentifier?: OLexerToken;
  label?: OLexerToken;
  labelLinks: OLabelName[] = [];
  convertedInstantiation = false;
}
export class OAssociation extends ObjectBase implements I.IHasDefinitions {
  constructor(public parent: OAssociationList, range: OIRange) {
    super(parent, range);
  }
  definitions: (OPort | OGeneric | OTypeMark)[] = [];
  formalPart: OFormalName[] = [];
  actualIfInput: OName[] = [];
  actualIfOutput: OName[] = [];
  actualIfInoutput: OName[] = [];
}

export class OEntity extends ObjectBase implements I.IHasDefinitions, I.IHasDeclarations,
  I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken,
  I.IHasLibraries, I.IHasGenerics, I.IHasPorts, I.IHasNameLinks, I.IMayHaveEndingLexerToken, I.IHasStatements {
  constructor(public parent: OFile, range: OIRange) {
    super(parent, range);
  }
  nameLinks: OName[] = [];
  referenceComponents: OComponent[] = [];
  referenceConfigurations: OConfigurationDeclaration[] = [];
  libraries: OLibrary[] = [];
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  aliasLinks: OAlias[] = [];
  lexerToken: OLexerToken;
  endingLexerToken: OLexerToken | undefined;
  useClauses: OUseClause[] = [];
  contextReferences: OContextReference[] = [];
  portRange?: OIRange;
  ports: OPort[] = [];
  genericRange?: OIRange;
  generics: OGeneric[] = [];
  statements: OConcurrentStatements[] = [];
  statementsRange: OIRange;
  definitions: OEntity[] = [];
  correspondingArchitectures: OArchitecture[] = [];
}
export class OComponent extends ObjectBase implements I.IHasDefinitions, I.IHasDeclarations,
  I.IHasPorts, I.IHasGenerics, I.IHasNameLinks, I.IHasLexerToken {
  constructor(parent: ObjectBase & I.IHasDeclarations, public lexerToken: OLexerToken) {
    super((parent as unknown) as ObjectBase, lexerToken.range);
  }
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];
  endingReferenceToken?: OLexerToken;
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  portRange?: OIRange;
  genericRange?: OIRange;
  ports: OPort[] = [];
  generics: OGeneric[] = [];
  definitions: OEntity[] = [];
}
export class OPort extends ObjectBase implements I.IVariableBase, I.IHasDefinitions, I.IHasLexerToken {
  parent: OEntity | OSubprogram;
  direction: 'in' | 'out' | 'inout';
  directionRange: OIRange;
  definitions: OPort[] = [];
  lexerToken: OLexerToken;
  nameLinks: OName[] = [];
  subtypeIndication: OSubtypeIndication;
  defaultValue?: OName[] = [];
  aliasLinks: OAlias[] = [];
  registerProcess?: OProcess;
}

export type OSequentialStatement = (OCase | OAssignment | OIf | OLoop | OInstantiation | OReport | OAssertion | OExit) & I.IMayHaveLabel;
export class OIf extends ObjectBase implements I.IMayHaveLabel {
  clauses: OIfClause[] = [];
  else?: OElseClause;
  label?: OLexerToken;
  labelLinks: OLabelName[];
}
export class OSequenceOfStatements extends ObjectBase implements I.IMayHaveLabel, I.IHasStatements {
  statements: OSequentialStatement[] = [];
  statementsRange: OIRange;
  labelLinks: OLabelName[] = [];
  label?: OLexerToken;
}
export class OElseClause extends OSequenceOfStatements {
}
export class OIfClause extends OSequenceOfStatements {
  condition: OName[] = [];
}
export class OCase extends ObjectBase implements I.IMayHaveLabel {
  expression: OName[] = [];
  whenClauses: OWhenClause[] = [];
  caseTokens: OLexerToken[] = [];
  label?: OLexerToken;
  labelLinks: OLabelName[] = [];
  matching = false;
}
export class OWhenClause extends OSequenceOfStatements {
  condition: OName[] = [];
  whenTokens: OLexerToken[] = [];
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

export class OSelectedName extends OName {
  constructor(public parent: ObjectBase, public nameToken: OLexerToken, public prefixTokens: SelectedNamePrefix, public write = false) {
    super(parent, nameToken, write, nameToken.range.copyWithNewStart(prefixTokens[0].range));
  }
  toString(): string {
    return this.prefixTokens.map(token => token.nameToken.text).join('.') + '.' + this.nameToken.text;
  }
}
export class OUseClause extends ObjectBase {
  names: [OName, ...OSelectedName[]];
  toString() { // Shows nicer info on debug
    return this.names.map(name => name.nameToken.text).join('.');
  }
}
export type SelectedNamePrefix = [
  first: OName,
  ...rest: OName[]
];
export class OAttributeName extends OName {
  public prefix?: OName;
  constructor(public parent: ObjectBase, public nameToken: OLexerToken) {
    super(parent, nameToken);
  }
}
export class ParserError extends Error {
  constructor(message: string,
    public range: OIRange,
    public solution?: { message: string, edits: TextEdit[] }
  ) {
    super(message);
  }
}
export enum MagicCommentType {
  Disable
}
abstract class OMagicComment extends ObjectBase {
  constructor(public parent: OFile, public commentType: MagicCommentType, range: OIRange,
    public rule?: string) {
    super(parent, range);
  }
}
export class OMagicCommentDisable extends OMagicComment {
  constructor(public parent: OFile,
    public commentType: MagicCommentType.Disable,
    range: OIRange, public rule?: string) {
    super(parent, commentType, range, rule);
  }
}
export class OSubprogram extends OSequenceOfStatements implements I.IHasNameLinks, I.IHasDeclarations, I.IHasPorts,
  I.IHasUseClauses, I.IHasLexerToken, I.IMayHaveEndingLexerToken, I.IHasDefinitions {
  hasBody = false;
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  parent: OPackage;
  labelLinks: OName[] = [];
  ports: OPort[] = [];
  portRange?: OIRange;
  return: OName[] = [];
  lexerToken: OLexerToken;
  endingLexerToken?: OLexerToken;
  definitions: OSubprogram[] = [];
}
export class OTypeMark extends ObjectBase {
  constructor(public parent: ObjectBase, public name: OName) {
    super(parent, name.range);
  }
}


export class OAlias extends ObjectBase implements I.IHasLexerToken, I.IHasNameLinks, I.IHasSubtypeIndication {
  name: OName[] = []; // The thing being aliased
  nameLinks: OName[] = [];
  aliasLinks: never[] = []; // recursive aliases are not allowed
  aliasDefinitions: ObjectBase[] = [];
  lexerToken: OLexerToken;
  subtypeIndication: OSubtypeIndication; // subtype_indication
}
export class OAliasWithSignature extends OAlias implements I.IHasLexerToken, I.IHasSubtypeIndication {
  typeMarks: OTypeMark[] = [];
  nameLinks: OName[] = [];
  lexerToken: OLexerToken;
  subtypeIndication: OSubtypeIndication;
  return: OName;
}

export class OConfigurationDeclaration extends ObjectBase implements I.IHasLibraries, I.IHasDefinitions, I.IHasNameLinks,
  I.IHasDeclarations, I.IHasUseClauses, I.IHasContextReference {
  lexerToken: OLexerToken;
  entityName: OLexerToken;
  libraries: OLibrary[] = [];
  definitions: OEntity[] = [];
  nameLinks: OInstantiation[] = [];
  aliasLinks: OAlias[] = [];
  declarations: ODeclaration[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
}
export class OConfigurationSpecification extends ObjectBase {
  lexerToken: undefined;
}
export class OAttributeSpecification extends ObjectBase implements I.IHasNameToken, I.IHasDefinitions {
  nameToken: OLexerToken;
  definitions: OAttributeDeclaration[] = [];
  names: OName[] = [];
  entityClass: OLexerToken;
  lexerToken: undefined;
}
export class OAttributeDeclaration extends ObjectBase implements I.IHasLexerToken, I.IHasNameLinks, I.IHasSubtypeIndication {
  lexerToken: OLexerToken;
  nameLinks: OName[] = [];
  aliasLinks: OAlias[] = [];
  aliasDefinitions: ObjectBase[] = [];
  subtypeIndication: OSubtypeIndication;
}



export function getTheInnermostNameChildren(name: OName) {
  let nameChild = name;
  let recursionLimit = 1000;
  while (nameChild.children[0] && nameChild.children[0].length > 0) {
    nameChild = nameChild.children[0].at(-1)!;
    if (recursionLimit-- <= 0) {
      throw new Error("Infinite Recursion");
    }
  }
  return nameChild;
}
export function getNameParent(name: OName) {
  let nameParent: ObjectBase = name;
  let recursionLimit = 1000;
  while (nameParent instanceof OName) {
    nameParent = nameParent.parent as OName;
    if (recursionLimit-- <= 0) {
      throw new Error("Infinite Recursion");
    }
  }
  return nameParent;
}
// export { scope } from './scopeIterator';