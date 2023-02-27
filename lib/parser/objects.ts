import { Position, Range, TextEdit } from 'vscode-languageserver';
import { OLexerToken } from '../lexer';
import { OIDiagnosticWithSolution } from '../vhdlLinter';
import * as I from './interfaces';
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




export abstract class OGeneric extends ObjectBase implements I.IHasDefinitions, I.IHasReferenceLinks {
  parent: OEntity;
  definitions: (OGeneric | OPackage)[] = [];
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[] = [];
  lexerToken: OLexerToken;
}
export class OGenericConstant extends OGeneric implements I.IVariableBase, I.IHasTypeReference, I.IHasDefaultValue {
  definitions: OGenericConstant[] = [];
  typeReference: OReference[] = [];
  defaultValue?: OReference[] = [];

}
export class OReference extends ObjectBase implements I.IHasDefinitions, I.IHasReferenceToken {
  definitions: ObjectBase[] = [];
  notDeclaredHint?: string;
  lexerToken: undefined;
  constructor(public parent: ObjectBase, public referenceToken: OLexerToken, range?: OIRange) {
    super(parent, range ?? referenceToken.range);
  }
}
export class OLabelReference extends OReference {
}
export class OFormalReference extends OReference {

}
export class OLibraryReference extends OReference {
  type = 'library'; // for ts
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
  readonly rootFile = this; // Provided as a convenience to equalize to ObjectBase
}

export class OInterfacePackage extends OGeneric implements I.IHasReferenceLinks, I.IHasUseClauses, I.IHasContextReference, I.IHasLibraries, I.IHasLexerToken {
  aliasReferences: OAlias[] = [];
  lexerToken: OLexerToken;
  uninstantiatedPackage: OReference[] = [];
  genericAssociationList?: OGenericAssociationList;
  referenceLinks: OReference[] = [];
  libraries: OLibrary[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
}
export class OPackageInstantiation extends ObjectBase implements I.IHasReferenceLinks, I.IHasUseClauses, I.IHasContextReference, I.IHasLibraries, I.IHasLexerToken {
  aliasReferences: OAlias[] = [];
  lexerToken: OLexerToken;
  uninstantiatedPackage: OReference[] = [];
  genericAssociationList?: OGenericAssociationList;
  referenceLinks: OReference[] = [];
  libraries: OLibrary[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
  targetLibrary?: string;
}

export class OPackage extends ObjectBase implements I.IHasDeclarations, I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken,
  I.IHasLibraries, I.IHasLibraryReference, I.IHasGenerics, I.IHasReferenceLinks, I.IMayHaveEndingLexerToken {
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[] = [];
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  parent: OFile;
  libraries: OLibrary[] = [];
  generics: OGeneric[] = [];
  genericRange?: OIRange;
  lexerToken: OLexerToken;
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
  library?: OLibraryReference;
  targetLibrary?: string;
  endingLexerToken?: OLexerToken;
  correspondingPackageBodies: OPackageBody[] = [];
}

export class OPackageBody extends ObjectBase implements I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken, I.IHasLibraries,
  I.IHasReferenceLinks, I.IMayHaveEndingLexerToken, I.IHasDeclarations {
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[] = [];
  lexerToken: OLexerToken;
  libraries: OLibrary[] = [];
  packageDefinitions: OPackage[] = [];
  useClauses: OUseClause[] = [];
  contextReferences: OContextReference[] = [];
  parent: OFile;
  targetLibrary?: string;
  correspondingPackage?: OPackage;
  endingLexerToken?: OLexerToken;
}


export class OLibrary extends ObjectBase implements I.IHasLexerToken, I.IHasReferenceLinks {
  constructor(public parent: ObjectBase | OFile, public lexerToken: OLexerToken) {
    super(parent, lexerToken.range);
  }
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[] = [];
}

export class OContextReference extends ObjectBase {
  constructor(public parent: OContext | ObjectBase | OFile, range: OIRange) {
    super(parent, range);
  }
  reference: OReference[];

}

export class OContext extends ObjectBase implements I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken, I.IHasLibraries {
  parent: OFile;
  lexerToken: OLexerToken;
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
  libraries: OLibrary[] = [];
  targetLibrary: undefined;
}
export type OConcurrentStatements = OProcess | OInstantiation | OIfGenerate | OForGenerate | OCaseGenerate | OBlock | OAssignment | OAssertion;
// ODeclaration also includes specifications
export type ODeclaration = OSignal | OAttributeSpecification | OAttributeDeclaration | OVariable | OConstant | OFileVariable | OType
  | OAlias | OSubprogram | OComponent | OPackageInstantiation | OConfigurationSpecification | OPackage | OPackageBody;

export abstract class OStatementBody extends ObjectBase implements I.IHasDeclarations,
  I.IHasUseClauses, I.IHasContextReference, I.IHasLibraries, I.IHasReferenceLinks, I.IHasStatements {
  referenceLinks: OReference[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  aliasReferences: OAlias[] = [];
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
  targetLibrary?: string;
}
export class OBlock extends OStatementBody implements I.IHasLabel {
  label: OLexerToken;
  labelLinks: OLabelReference[] = [];
  lexerToken: undefined;
  guardCondition?: OReference[];
}
export class OUnit extends ObjectBase implements I.IHasReferenceLinks, I.IHasLexerToken {
  constructor(parent: OType, public lexerToken: OLexerToken) {
    super(parent, lexerToken.range);
  }
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[] = [];

}
export class OType extends ObjectBase implements I.IHasReferenceLinks,
  I.IHasUseClauses, I.IHasLexerToken, I.IHasDeclarations {
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  incomplete = false;
  aliasReferences: OAlias[] = [];
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  referenceLinks: OReference[] = [];
  units: OUnit[] = [];
  alias = false;
  lexerToken: OLexerToken;
  protected = false;
  protectedBody = false;
  addReadsToMap(map: Map<string, ObjectBase>) {
    map.set(this.lexerToken.getLText(), this);

    for (const unit of this.units) {
      map.set(unit.lexerToken.getLText(), this);
    }
    if (this instanceof OEnum) {
      for (const state of this.literals) {
        map.set(state.lexerToken.getLText(), state);
      }
    } else if (this instanceof ORecord) {
      for (const child of this.children) {
        map.set(child.lexerToken.getLText(), child);
      }
    }
    for (const subprogram of this.declarations) {
      if (subprogram instanceof OSubprogram) {
        map.set(subprogram.lexerToken.getLText(), subprogram);
      }
    }
  }

}
export class OSubType extends OType {
  superType: OReference;
  resolved = false;
  referenceLinks: OReference[] = [];
}
export class OEnum extends OType {
  literals: OEnumLiteral[] = [];
}
export class ORecord extends OType implements I.IMayHaveEndingLexerToken {
  children: ORecordChild[] = [];
  endingLexerToken?: OLexerToken;
}
export class OArray extends OType {
  elementType: OReference[] = [];
}
export class ORecordChild extends OType implements I.IHasTypeReference {
  typeReference: OReference[] = [];
  public parent: ORecord;
}
export class OEnumLiteral extends ObjectBase implements I.IHasReferenceLinks, I.IHasLexerToken {
  referenceLinks: OReference[] = [];
  public parent: OEnum;
  public lexerToken: OLexerToken;
  aliasReferences: OAlias[] = [];

}
export class OForGenerate extends OStatementBody implements I.IHasLabel {
  lexerToken: undefined;
  label: OLexerToken;
  iterationConstant: OLexerToken;
  iterationRangeTokens: OLexerToken[];
  labelLinks: OLabelReference[] = [];
  constructor(public parent: OArchitecture,
    range: OIRange,
    public variableRange: OReference[],
  ) {
    super(parent, range);
  }
}
export class OCaseGenerate extends ObjectBase implements I.IHasLabel {
  expression: OReference[] = [];
  expressionTokens: OLexerToken[] = [];
  whenGenerateClauses: OWhenGenerateClause[] = [];
  label: OLexerToken;
  labelLinks: OLabelReference[] = [];
  lexerToken: undefined;
}
export class OWhenGenerateClause extends OStatementBody implements I.IMayHaveLabel {
  lexerToken: undefined;
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
  condition: OReference[] = [];
  conditionTokens: OLexerToken[] = [];
  public parent: OCaseGenerate;
}
export class OIfGenerate extends ObjectBase implements I.IHasLabel {
  constructor(public parent: ObjectBase | OFile, public range: OIRange, public label: OLexerToken) {
    super(parent, range);
  }
  ifGenerateClauses: OIfGenerateClause[] = [];
  elseGenerateClause?: OElseGenerateClause;
  labelLinks: OLabelReference[] = [];
  lexerToken: undefined;
}
export class OIfGenerateClause extends OStatementBody implements I.IMayHaveLabel {
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
  lexerToken: undefined;
  condition: OReference[] = [];
  conditionTokens: OLexerToken[] = [];
  public parent: OIfGenerate;

}
export class OElseGenerateClause extends OStatementBody implements I.IMayHaveLabel {
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];

  lexerToken: undefined;
  public parent: OIfGenerate;

}



export class OFileVariable extends ObjectBase implements I.IVariableBase {
  aliasReferences: OAlias[] = [];

  referenceLinks: OReference[] = [];
  typeReference: OReference[] = [];
  defaultValue?: OReference[] = [];
  lexerToken: OLexerToken;
  openKind?: OReference[];
  logicalName?: OReference[];
  constructor(parent: I.IHasDeclarations, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OVariable extends ObjectBase implements I.IVariableBase {
  referenceLinks: OReference[] = [];
  typeReference: OReference[] = [];
  defaultValue?: OReference[] = [];
  lexerToken: OLexerToken;
  aliasReferences: OAlias[] = [];
  shared = false;
  constructor(parent: I.IHasDeclarations, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OSignal extends ObjectBase implements I.IVariableBase {
  referenceLinks: OReference[] = [];
  typeReference: OReference[] = [];
  defaultValue?: OReference[] = [];
  lexerToken: OLexerToken;
  aliasReferences: OAlias[] = [];
  registerProcess?: OProcess;
  constructor(parent: (ObjectBase & I.IHasDeclarations), range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OConstant extends ObjectBase implements I.IVariableBase {
  referenceLinks: OReference[] = [];
  typeReference: OReference[] = [];
  defaultValue?: OReference[] = [];
  lexerToken: OLexerToken;
  aliasReferences: OAlias[] = [];

  constructor(parent: I.IHasDeclarations, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OAssociationList extends ObjectBase {
  constructor(public parent: OInstantiation | OPackage | OPackageInstantiation, range: OIRange) {
    super(parent, range);
  }
  public children: OAssociation[] = [];

}
export class OGenericAssociationList extends OAssociationList {
  constructor(public parent: OInstantiation | OPackage | OPackageInstantiation, range: OIRange) {
    super(parent, range);
  }
}
export class OPortAssociationList extends OAssociationList {
  constructor(public parent: OInstantiation | OPackage | OPackageInstantiation, range: OIRange) {
    super(parent, range);
  }
}

export class OInstantiation extends OReference implements I.IHasDefinitions, I.IHasLibraryReference, I.IMayHaveLabel, I.IHasPostponed {
  constructor(public parent: OStatementBody | OEntity | OProcess | OLoop | OIf, lexerToken: OLexerToken, public type: 'entity' | 'component' | 'configuration' | 'subprogram' | 'unknown' = 'unknown') {
    super(parent, lexerToken);
  }
  postponed = false;
  definitions: (OEntity | OSubprogram | OComponent | OAliasWithSignature | OConfigurationDeclaration)[] = [];
  prefix: OLexerToken[] = [];
  entityName: OLexerToken;
  package?: OLexerToken;
  portAssociationList?: OPortAssociationList;
  genericAssociationList?: OGenericAssociationList;

  library?: OLibraryReference;
  archIdentifier?: OLexerToken;
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
  // getRootElement() {
  //   return super.getRootElement() as Exclude<ORootElements, OPackageInstantiation | OContext>;
  // }
}
export class OAssociation extends ObjectBase implements I.IHasDefinitions {
  constructor(public parent: OAssociationList, range: OIRange) {
    super(parent, range);
  }
  definitions: (OPort | OGeneric | OTypeMark)[] = [];
  formalPart: OFormalReference[] = [];
  actualIfInput: OReference[] = [];
  actualIfOutput: OReference[] = [];
  actualIfInoutput: OReference[] = [];
}

export class OEntity extends ObjectBase implements I.IHasDefinitions, I.IHasDeclarations,
  I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken,
  I.IHasLibraries, I.IHasGenerics, I.IHasPorts, I.IHasReferenceLinks, I.IMayHaveEndingLexerToken, I.IHasStatements {
  constructor(public parent: OFile, range: OIRange, public targetLibrary?: string) {
    super(parent, range);
  }
  referenceLinks: OReference[] = [];
  referenceComponents: OComponent[] = [];
  referenceConfigurations: OConfigurationDeclaration[] = [];
  libraries: OLibrary[] = [];
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  aliasReferences: OAlias[] = [];
  lexerToken: OLexerToken;
  endingLexerToken: OLexerToken | undefined;
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
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
  I.IHasPorts, I.IHasGenerics, I.IHasReferenceLinks, I.IHasLexerToken {
  constructor(parent: ObjectBase & I.IHasDeclarations, public lexerToken: OLexerToken) {
    super((parent as unknown) as ObjectBase, lexerToken.range);
  }
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[] = [];
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
  referenceLinks: OReference[] = [];
  typeReference: OReference[] = [];
  defaultValue?: OReference[] = [];
  aliasReferences: OAlias[] = [];
  registerProcess?: OProcess;
}

export type OSequentialStatement = (OCase | OAssignment | OIf | OLoop | OInstantiation | OReport | OAssertion | OExit) & I.IMayHaveLabel;
export class OIf extends ObjectBase implements I.IMayHaveLabel {
  clauses: OIfClause[] = [];
  else?: OElseClause;
  label?: OLexerToken;
  labelLinks: OLabelReference[];
}
export class OSequenceOfStatements extends ObjectBase implements I.IMayHaveLabel, I.IHasStatements {
  statements: OSequentialStatement[] = [];
  statementsRange: OIRange;
  labelLinks: OLabelReference[] = [];
  label?: OLexerToken;
}
export class OElseClause extends OSequenceOfStatements {
}
export class OIfClause extends OSequenceOfStatements {
  condition: OReference[] = [];
}
export class OCase extends ObjectBase implements I.IMayHaveLabel {
  expression: OReference[] = [];
  whenClauses: OWhenClause[] = [];
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
}
export class OWhenClause extends OSequenceOfStatements {
  condition: OReference[] = [];
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
  sensitivityList: OReference[] = [];
  labelLinks: OLabelReference[] = [];

}

export class OLoop extends OSequenceOfStatements {
}
export class OForLoop extends OLoop implements I.IHasDeclarations {
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  constantRange: OReference[] = [];
}
export class OWhileLoop extends OLoop {
  condition: OReference[] = [];
}
export class OAssignment extends ObjectBase implements I.IMayHaveLabel, I.IHasPostponed {
  writes: OWrite[] = [];
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
  references: OReference[] = [];
  postponed = false;
  guarded = false;
}
export class OExit extends ObjectBase implements I.IMayHaveLabel {
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
  references: OReference[] = [];
  labelReference?: OLabelReference;
}

export class OReport extends ObjectBase implements I.IMayHaveLabel {
  references: OReference[] = [];
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
}
export class OReturn extends ObjectBase implements I.IMayHaveLabel {
  references: OReference[] = [];
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
}
export class OAssertion extends ObjectBase implements I.IMayHaveLabel {
  references: OReference[] = [];
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
  postponed: boolean;
}

export class OWrite extends OReference {
  // Workaround for checking of OWrites in associations. Because of overloading they can not be correctly checked.
  // This avoid false positives
  public inAssociation = false;
  type = 'OWrite'; // Make sure typescript type checking does not accept OReference as OWrite
}
export class OSelectedNameWrite extends OWrite {
  constructor(public parent: ObjectBase, public referenceToken: OLexerToken, public prefixTokens: SelectedNamePrefix) {
    super(parent, referenceToken, referenceToken.range.copyWithNewStart(prefixTokens[0].range));
  }
}
export class ORead extends OReference {
  private type = 'ORead'; // Make sure typescript type checking does not accept OReference as ORead
}
export class OSelectedName extends OReference {
  constructor(public parent: ObjectBase, public referenceToken: OLexerToken, public prefixTokens: SelectedNamePrefix) {
    super(parent, referenceToken, referenceToken.range.copyWithNewStart(prefixTokens[0].range));
  }
}
export class OUseClause extends ObjectBase {
  reference: [OReference, ...OSelectedName[]];
}
export class OSelectedNameRead extends ORead {
  constructor(public parent: ObjectBase, public referenceToken: OLexerToken, public prefixTokens: SelectedNamePrefix) {
    super(parent, referenceToken, referenceToken.range.copyWithNewStart(prefixTokens[0].range));
  }
}
export type SelectedNamePrefix = [
  first: OReference,
  ...rest: OReference[]
];
export class OAttributeReference extends OReference {
  public prefix: OReference;
  constructor(public parent: ObjectBase, public referenceToken: OLexerToken) {
    super(parent, referenceToken);
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
export class OSubprogram extends OSequenceOfStatements implements I.IHasReferenceLinks, I.IHasDeclarations, I.IHasPorts,
  I.IHasUseClauses, I.IHasLexerToken, I.IMayHaveEndingLexerToken {
  hasBody = false;
  declarations: ODeclaration[] = [];
  declarationsRange?: OIRange;
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  parent: OPackage;
  labelLinks: OReference[] = [];
  ports: OPort[] = [];
  portRange?: OIRange;
  return: OReference[] = [];
  lexerToken: OLexerToken;
  endingLexerToken?: OLexerToken;
}
export class OTypeMark extends ObjectBase {
  constructor(public parent: ObjectBase, public reference: OReference) {
    super(parent, reference.range);
  }
}


export class OAlias extends ObjectBase implements I.IHasLexerToken, I.IHasReferenceLinks {
  name: OReference[] = []; // The thing being aliased
  referenceLinks: OReference[] = [];
  aliasReferences: never[] = []; // Not used. (Because recursive aliases are not allowed)
  aliasDefinitions: ObjectBase[] = [];
  lexerToken: OLexerToken;
  subtypeIndication: OReference[] = []; // subtype_indication
}
export class OAliasWithSignature extends OAlias implements I.IHasLexerToken {
  typeMarks: OTypeMark[] = [];
  referenceLinks: OReference[] = [];
  lexerToken: OLexerToken;
  subtypeIndication: OReference[] = [];
  return: OReference;
}

export class OConfigurationDeclaration extends ObjectBase implements I.IHasLibraries, I.IHasDefinitions, I.IHasReferenceLinks,
  I.IHasDeclarations, I.IHasUseClauses, I.IHasContextReference {
  lexerToken: OLexerToken;
  targetLibrary?: string;
  entityName: OLexerToken;
  libraries: OLibrary[] = [];
  definitions: OEntity[] = [];
  referenceLinks: OInstantiation[] = [];
  aliasReferences: OAlias[] = [];
  declarations: ODeclaration[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
}
export class OConfigurationSpecification extends ObjectBase {
  lexerToken: undefined;
}
export class OAttributeSpecification extends ObjectBase implements I.IHasReferenceToken, I.IHasDefinitions {
  referenceToken: OLexerToken;
  definitions: OAttributeDeclaration[] = [];
  references: OReference[] = [];
  entityClass: OLexerToken;
  lexerToken: undefined;
}
export class OAttributeDeclaration extends ObjectBase implements I.IHasLexerToken, I.IHasReferenceLinks {
  lexerToken: OLexerToken;
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[] = [];
  aliasDefinitions: ObjectBase[] = [];
  typeReferences: OReference[] = [];
}

// Returns all object visible starting from the startObjects scope.
// The second parameter defines if the object is directly visible.
export function* scope(startObject: ObjectBase): Generator<[ObjectBase, boolean]> {
  let current = startObject;
  let directlyVisible = true;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    yield [current, directlyVisible];
    if (current instanceof OArchitecture && current.correspondingEntity) {
      yield [current.correspondingEntity, directlyVisible];
      directlyVisible = false;
      for (const packages of current.correspondingEntity.packageDefinitions) {
        yield [packages, directlyVisible];
      }
    }
    if (current instanceof OPackageBody && current.correspondingPackage) {
      yield [current.correspondingPackage, directlyVisible];
      directlyVisible = false;
      for (const packages of current.correspondingPackage.packageDefinitions) {
        yield [packages, directlyVisible];
      }
    }
    if (I.implementsIHasUseClause(current)) {
      for (const packages of current.packageDefinitions) {
        directlyVisible = false;
        yield [packages, directlyVisible];
      }
    }
    if (current.parent instanceof OFile) {
      break;
    }
    current = current.parent;
  }
}