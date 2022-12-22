import { Position, Range, TextEdit } from 'vscode-languageserver';
import { OLexerToken } from '../lexer';
import * as I from './interfaces';
export class OI implements Position {
  protected i_?: number;
  constructor(parent: ObjectBase | OFile, i: number)
  constructor(parent: ObjectBase | OFile, line: number, character: number)
  constructor(parent: ObjectBase | OFile, line: number, character: number, i: number)
  constructor(public parent: ObjectBase | OFile, i: number, j?: number, k?: number) {
    if (j === Number.POSITIVE_INFINITY) {
      const lines = (this.parent instanceof OFile ? this.parent : this.parent.rootFile).lines;
      j = lines[i].length - 1;
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
    }
    return this.i_ as number;
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
    const character = lines[lines.length - 1].length;
    return { character, line };
  }
  private calcI() {
    if (typeof this.position === 'undefined') {
      throw new Error('Something went wrong with OIRange');
    }
    const lines = (this.parent instanceof OFile ? this.parent : this.parent.rootFile).lines;
    this.i_ = lines.slice(0, this.position.line).join('\n').length + 1 + Math.min(this.position.character, lines[this.position.line].length);
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
  getLimitedRange(limit = 5) {
    const newEnd = this.end.line - this.start.line > limit ?
      new OI(this.parent, this.start.line + limit, Number.POSITIVE_INFINITY)
      : this.end;
    return new OIRange(this.parent, this.start, newEnd);
  }
  copyExtendBeginningOfLine() {
    const lines = (this.parent instanceof OFile ? this.parent : this.parent.rootFile).lines;
    let startCol = 0;
    const match = lines[this.start.line].match(/\S/);
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
  private rootElement?: OArchitecture | OEntity | OPackage | OPackageBody;

  getRootElement(): OArchitecture | OEntity | OPackage | OPackageBody {
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
      && parent instanceof OContext === false) {
      if (parent.parent instanceof OFile) {
        throw new ParserError('Failed to find root element', this.range);
      }
      parent = parent.parent;
    }
    this.rootElement = parent as OArchitecture | OEntity | OPackage | OPackageBody;
    return this.rootElement;
  }
  lexerTokenEquals(other: ObjectBase) {
    return this.lexerToken?.text?.toLowerCase() === other?.lexerToken?.text?.toLowerCase();
  }
}




export abstract class OGeneric extends ObjectBase implements I.IHasDefinitions, I.IHasReferenceLinks {
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
  lexerToken: undefined;
  constructor(public parent: ObjectBase, public referenceToken: OLexerToken, range?: OIRange) {
    super(parent, range ?? referenceToken.range);
  }
}
export class OFormalReference extends OReference {

}
export class OFile {
  parserMessages: I.OIDiagnosticWithSolution[] = [];
  public lines: string[];
  constructor(public text: string, public file: string, public originalText: string) {
    this.lines = originalText.split('\n');
  }

  objectList: ObjectBase[] = [];
  contexts: OContext[] = [];
  magicComments: (OMagicCommentDisable)[] = [];
  entities: OEntity[] = [];
  architectures: OArchitecture[] = [];
  packages: (OPackage | OPackageBody)[] = [];
  packageInstantiations: OPackageInstantiation[] = [];
  configurations: OConfiguration[] = [];
  readonly rootFile = this; // Provided as a convenience to equalize to ObjectBase
  getJSON() {
    const seen = new WeakSet();

    return JSON.stringify(this, (key, value) => {
      if (['parent', 'originalText', 'objectList', 'root'].indexOf(key) > -1) {
        return;
      }
      // text of file
      if (typeof value === 'string' && value.length > 1000) {
        return;
      }
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return;
        }
        value.proto = value.constructor.name;
        seen.add(value);
      }
      return value;
    });
  }
}

export class OInterfacePackage extends OGeneric implements I.IHasReferenceLinks, I.IHasUseClauses, I.IHasContextReference, I.IHasLibraries, I.IHasLexerToken, I.IHasDefinitions {
  aliasReferences: OAlias[] = [];
  lexerToken: OLexerToken;
  uninstantiatedPackageToken: OLexerToken;
  definitions: OPackage[] = [];
  genericAssociationList?: OGenericAssociationList;
  referenceLinks: OReference[] = [];
  libraries: OLibrary[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
}
export class OPackageInstantiation extends ObjectBase implements I.IHasReferenceLinks, I.IHasUseClauses, I.IHasContextReference, I.IHasLibraries, I.IHasLexerToken, I.IHasDefinitions {
  aliasReferences: OAlias[] = [];
  lexerToken: OLexerToken;
  uninstantiatedPackageToken: OLexerToken;
  definitions: OPackage[] = [];
  genericAssociationList?: OGenericAssociationList;
  referenceLinks: OReference[] = [];
  libraries: OLibrary[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
}

export class OPackage extends ObjectBase implements I.IHasSubprograms, I.IHasComponents, I.IHasSignals, I.IHasConstants,
  I.IHasVariables, I.IHasTypes, I.IHasAliases, I.IHasFileVariables, I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken,
  I.IHasLibraries, I.IHasLibraryReference, I.IHasGenerics, I.IHasReferenceLinks {
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[] = [];
  parent: OFile;
  aliases: OAlias[] = [];
  libraries: OLibrary[] = [];
  generics: OGeneric[] = [];
  genericRange?: OIRange;
  lexerToken: OLexerToken;
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  packageInstantiations: OPackageInstantiation[] = [];
  contextReferences: OContextReference[] = [];
  library?: OLexerToken;
  subprograms: OSubprogram[] = [];
  components: OComponent[] = [];
  signals: OSignal[] = [];
  constants: OConstant[] = [];
  variables: OVariable[] = [];
  files: OFileVariable[] = [];
  types: OType[] = [];
  targetLibrary?: string;
}

export class OPackageBody extends ObjectBase implements I.IHasSubprograms, I.IHasConstants, I.IHasVariables, I.IHasTypes,
  I.IHasAliases, I.IHasFileVariables, I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken, I.IHasLibraries, I.IHasReferenceLinks {
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[] = [];
  lexerToken: OLexerToken;
  libraries: OLibrary[] = [];
  aliases: OAlias[] = [];
  packageInstantiations: OPackageInstantiation[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
  parent: OFile;
  subprograms: OSubprogram[] = [];
  constants: OConstant[] = [];
  variables: OVariable[] = [];
  types: OType[] = [];
  files: OFileVariable[] = [];
  targetLibrary?: string;
  correspondingPackage?: OPackage;
}


export class OLibrary extends ObjectBase implements I.IHasLexerToken, I.IHasReferenceLinks {
  constructor(public parent: ObjectBase | OFile, public lexerToken: OLexerToken) {
    super(parent, lexerToken.range);
  }
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[] = [];
}

export class OContextReference extends ObjectBase implements I.IHasLibraryReference {
  constructor(public parent: OContext | ObjectBase, range: OIRange, public library: OLexerToken, public contextName: string) {
    super(parent, range);
  }
  definitions: ObjectBase[] = [];

}

export class OContext extends ObjectBase implements I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken, I.IHasLibraries {
  parent: OFile;
  lexerToken: OLexerToken;
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
  libraries: OLibrary[] = [];
}
export type OConcurrentStatements = OProcess | OInstantiation | OIfGenerate | OForGenerate | OBlock | OAssignment;

export abstract class OStatementBody extends ObjectBase implements I.IHasSubprograms, I.IHasComponents, I.IHasInstantiations,
  I.IHasSignals, I.IHasConstants, I.IHasVariables, I.IHasTypes, I.IHasAliases, I.IHasFileVariables, I.IHasUseClauses, I.IHasContextReference,
  I.IHasPackageInstantiations, I.IHasLibraries, I.IHasReferenceLinks, I.IHasIfGenerates, I.IHasForGenerates {
  referenceLinks: OReference[] = [];
  useClauses: OUseClause[] = [];
  subprogramAliases: OAliasWithSignature[] = [];
  aliasReferences: OAlias[] = [];

  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
  libraries: OLibrary[] = [];
  packageInstantiations: OPackageInstantiation[] = [];
  signals: OSignal[] = [];
  constants: OConstant[] = [];
  variables: OVariable[] = [];
  files: OFileVariable[] = [];
  types: OType[] = [];
  aliases: OAlias[] = [];
  subprograms: OSubprogram[] = [];
  components: OComponent[] = [];
  statements: OConcurrentStatements[] = [];
  correspondingEntity?: OEntity;
  endOfDeclarativePart?: OI;
  get processes() {
    return this.statements.filter(s => s instanceof OProcess) as OProcess[];
  }
  get instantiations() {
    return this.statements.filter(s => s instanceof OInstantiation) as OInstantiation[];
  }
  get ifGenerates() {
    return this.statements.filter(s => s instanceof OIfGenerate) as OIfGenerate[];
  }
  get forGenerates() {
    return this.statements.filter(s => s instanceof OForGenerate) as OForGenerate[];
  }
  get blocks() {
    return this.statements.filter(s => s instanceof OBlock) as OBlock[];
  }
  get assignments() {
    return this.statements.filter(s => s instanceof OAssignment) as OAssignment[];
  }

  get generates() {
    const generates: OStatementBody[] = this.forGenerates;
    for (const ifObj of this.ifGenerates) {
      generates.push(...ifObj.ifGenerates);
      if (ifObj.elseGenerate) {
        generates.push(ifObj.elseGenerate);
      }
    }
    return generates;
  }
}
export class OArchitecture extends OStatementBody implements I.IHasLexerToken {
  lexerToken: OLexerToken;
  entityName: OLexerToken;

}
export class OBlock extends OStatementBody implements I.IHasLabel {
  label: OLexerToken;
  labelLinks: OLabelReference[] = [];
  lexerToken: undefined;
  guardCondition?: OReference[];
}
export class OUnit extends ObjectBase implements I.IHasReferenceLinks, I.IHasLexerToken{
  constructor(parent: OType, public lexerToken: OLexerToken) {
    super(parent, lexerToken.range);
  }
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[] = [];

}
export class OType extends ObjectBase implements I.IHasReferenceLinks, I.IHasSubprograms, I.IHasSignals, I.IHasConstants, I.IHasVariables,
  I.IHasTypes, I.IHasAliases, I.IHasFileVariables, I.IHasUseClauses, I.IHasLexerToken, I.IHasPackageInstantiations {
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  incomplete = false;
  packageInstantiations: OPackageInstantiation[] = [];
  types: OType[] = [];
  aliases: OAlias[] = [];
  aliasReferences: OAlias[] = [];

  subprograms: OSubprogram[] = [];
  variables: OVariable[] = [];
  constants: OConstant[] = [];
  signals: OSignal[] = [];
  files: OFileVariable[] = [];
  referenceLinks: OReference[] = [];
  units: OUnit[] = [];
  alias = false;
  lexerToken: OLexerToken;
  protected = false;
  protectedBody = false;
  addReadsToMap(map: Map<string, ObjectBase>) {
    map.set(this.lexerToken.getLText(), this);

    if (this.units) {
      for (const unit of this.units) {
        map.set(unit.lexerToken.getLText(), this);

      }
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
    for (const subprogram of this.subprograms) {
      map.set(subprogram.lexerToken.getLText(), subprogram);
    }
  }
}
export class OSubType extends OType {
  superType: OReference;
  referenceLinks: OReference[] = [];
}
export class OEnum extends OType {
  literals: OEnumLiteral[] = [];
}
export class ORecord extends OType {
  children: ORecordChild[] = [];
}
export class ORecordChild extends OType {
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
  whenGenerates: OWhenGenerateClause[] = [];
  label: OLexerToken;
  labelLinks: OLabelReference[] = [];

}
export class OWhenGenerateClause extends OStatementBody implements I.IMayHaveLabel {
  lexerToken: undefined;
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
  condition: OReference[] = [];
  public parent: OCaseGenerate;
}
export class OIfGenerate extends ObjectBase implements I.IHasLabel {
  constructor(public parent: ObjectBase | OFile, public range: OIRange, public lexerToken: OLexerToken) {
    super(parent, range);
  }
  ifGenerates: OIfGenerateClause[] = [];
  elseGenerate: OElseGenerateClause;
  label: OLexerToken;
  labelLinks: OLabelReference[] = [];

}
export class OIfGenerateClause extends OStatementBody implements I.IMayHaveLabel {
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
  lexerToken: undefined;
  condition: OReference[] = [];
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
  constructor(parent: I.IHasFileVariables, range: OIRange) {
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
  constructor(parent: I.IHasVariables, range: OIRange) {
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
  constructor(parent: (ObjectBase & I.IHasSignals), range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OConstant extends ObjectBase implements I.IVariableBase {
  referenceLinks: OReference[] = [];
  typeReference: OReference[] = [];
  defaultValue?: OReference[] = [];
  lexerToken: OLexerToken;
  aliasReferences: OAlias[] = [];

  constructor(parent: I.IHasConstants, range: OIRange) {
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

export class OInstantiation extends OReference implements I.IHasDefinitions, I.IHasLibraryReference, I.IMayHaveLabel {
  constructor(public parent: OStatementBody | OEntity | OProcess | OLoop | OIf, lexerToken: OLexerToken, public type: 'entity' | 'component' | 'configuration' | 'subprogram' | 'unknown' = 'unknown') {
    super(parent, lexerToken);
  }
  definitions: (OEntity | OSubprogram | OComponent | OAliasWithSignature)[] = [];
  componentName: OLexerToken;
  package?: OLexerToken;
  portAssociationList?: OPortAssociationList;
  genericAssociationList?: OGenericAssociationList;
  library?: OLexerToken;
  archIdentifier?: OLexerToken;
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
}
export class OAssociation extends ObjectBase implements I.IHasDefinitions {
  constructor(public parent: OAssociationList, range: OIRange) {
    super(parent, range);
  }
  definitions: (OPort | OGeneric | OTypeMark)[] = [];
  formalPart: OFormalReference[] = [];
  actualIfInput: OReference[] = [];
  actualIfOutput: [OReference[], OWrite[]] = [[], []];
  actualIfInoutput: [OReference[], OWrite[]] = [[], []];
}
export class OEntity extends ObjectBase implements I.IHasDefinitions, I.IHasSubprograms, I.IHasSignals, I.IHasConstants, I.IHasVariables,
  I.IHasTypes, I.IHasAliases, I.IHasFileVariables, I.IHasUseClauses, I.IHasContextReference, I.IHasLexerToken, I.IHasPackageInstantiations, I.IHasLibraries, I.IHasGenerics, I.IHasPorts, I.IHasReferenceLinks {
  constructor(public parent: OFile, range: OIRange, public targetLibrary?: string) {
    super(parent, range);
  }
  referenceLinks: OReference[] = [];
  libraries: OLibrary[] = [];
  aliases: OAlias[] = [];
  aliasReferences: OAlias[] = [];

  packageInstantiations: OPackageInstantiation[] = [];
  lexerToken: OLexerToken;
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
  portRange?: OIRange;
  ports: OPort[] = [];
  genericRange?: OIRange;
  generics: OGeneric[] = [];
  signals: OSignal[] = [];
  constants: OConstant[] = [];
  variables: OVariable[] = [];
  subprograms: OSubprogram[] = [];
  types: OType[] = [];
  statements: (OProcess | OAssignment)[] = [];
  definitions: OEntity[] = [];
  files: OFileVariable[] = [];
}
export class OComponent extends ObjectBase implements I.IHasDefinitions, I.IHasSubprograms, I.IHasLexerToken,
  I.IHasPackageInstantiations, I.IHasPorts, I.IHasGenerics, I.IHasReferenceLinks {
  constructor(parent: I.IHasComponents, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[] = [];
  lexerToken: OLexerToken;
  subprograms: OSubprogram[] = [];
  packageInstantiations: OPackageInstantiation[] = [];
  portRange?: OIRange;
  genericRange?: OIRange;
  ports: OPort[] = [];
  generics: OGeneric[] = [];
  definitions: OEntity[] = [];
}
export class OPort extends ObjectBase implements I.IVariableBase, I.IHasDefinitions, I.IHasLexerToken {
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
export class OHasSequentialStatements extends ObjectBase implements I.IHasInstantiations, I.IMayHaveLabel {
  statements: OSequentialStatement[] = [];
  labelLinks: OLabelReference[] = [];
  label?: OLexerToken;
  get cases() {
    return this.statements.filter(s => s instanceof OCase) as OCase[];
  }
  get assignments() {
    return this.statements.filter(s => s instanceof OAssignment) as OAssignment[];
  }
  get ifs() {
    return this.statements.filter(s => s instanceof OIf) as OIf[];
  }
  get loops() {
    return this.statements.filter(s => s instanceof OLoop) as OLoop[];
  }
  get instantiations() {
    return this.statements.filter(s => s instanceof OInstantiation) as OInstantiation[];
  }
}
export class OElseClause extends OHasSequentialStatements {
}
export class OIfClause extends OHasSequentialStatements implements I.IHasInstantiations {
  condition: OReference[] = [];
}
export class OCase extends ObjectBase implements I.IMayHaveLabel {
  expression: OReference[] = [];
  whenClauses: OWhenClause[] = [];
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
}
export class OWhenClause extends OHasSequentialStatements implements I.IHasInstantiations {
  condition: OReference[] = [];
}
export class OProcess extends OHasSequentialStatements implements I.IHasSubprograms, I.IHasInstantiations, I.IHasConstants, I.IHasVariables,
  I.IHasTypes, I.IHasAliases, I.IHasFileVariables, I.IHasUseClauses {
  label?: OLexerToken;

  aliases: OAlias[] = [];
  packageInstantiations: OPackageInstantiation[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  sensitivityList: OReference[] = [];
  types: OType[] = [];
  subprograms: OSubprogram[] = [];
  variables: OVariable[] = [];
  files: OFileVariable[] = [];
  constants: OConstant[] = [];
}

export class OLoop extends OHasSequentialStatements implements I.IHasInstantiations {
}
export class OForLoop extends OLoop implements I.IHasConstants {
  // TODO: Change constants to constant without breaking stuff
  constants: OConstant[] = [];
  constantRange: OReference[] = [];
}
export class OWhileLoop extends OLoop {
  condition: OReference[] = [];
}
export class OAssignment extends ObjectBase implements I.IMayHaveLabel {
  writes: OWrite[] = [];
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
  references: OReference[] = [];
  postponed = false;
  guarded = false;
}
export class OLabelReference extends ObjectBase {
  definitions: ObjectBase[] = [];
  lexerToken: undefined;
  constructor(public parent: ObjectBase, public referenceToken: OLexerToken, range?: OIRange) {
    super(parent, range ?? referenceToken.range);
  }
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
export class OAssertion extends ObjectBase implements I.IMayHaveLabel{
  references: OReference[] = [];
  label?: OLexerToken;
  labelLinks: OLabelReference[] = [];
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
export class OUseClause extends OSelectedName implements I.IHasLibraryReference {
  constructor(public parent: ObjectBase, public library: OLexerToken | undefined, public packageName: OLexerToken, public suffix: OLexerToken) {
    super(parent, suffix, library ? [library, packageName] : [packageName]);
  }
}
export class OSelectedNameRead extends ORead {
  constructor(public parent: ObjectBase, public referenceToken: OLexerToken, public prefixTokens: SelectedNamePrefix) {
    super(parent, referenceToken, referenceToken.range.copyWithNewStart(prefixTokens[0].range));
  }
}
export type SelectedNamePrefix = [
  first: OLexerToken,
  ...rest: OLexerToken[]
];
export class OAttributeReference extends OReference {
  constructor(public parent: ObjectBase, public referenceToken: OLexerToken, public prefix: OReference) {
    super(parent, referenceToken);
  }
}
export class ParserError extends Error {
  constructor(message: string, public range: OIRange, public solution?: { message: string, edits: TextEdit[] }) {
    super(message);
  }
}
export enum MagicCommentType {
  Disable
}
export class OMagicComment extends ObjectBase {
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
export class OSubprogram extends OHasSequentialStatements implements I.IHasReferenceLinks, I.IHasSubprograms, I.IHasInstantiations, I.IHasPorts,
  I.IHasVariables, I.IHasTypes, I.IHasAliases, I.IHasFileVariables, I.IHasUseClauses, I.IHasLexerToken, I.IHasPackageInstantiations, I.IHasConstants {
  hasBody = false;
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  parent: OPackage;
  packageInstantiations: OPackageInstantiation[] = [];
  labelLinks: OReference[] = [];
  aliases: OAlias[] = [];
  variables: OVariable[] = [];
  files: OFileVariable[] = [];
  constants: OConstant[] = [];
  ports: OPort[] = [];
  types: OType[] = [];
  subprograms: OSubprogram[] = [];
  return: OReference[] = [];
  lexerToken: OLexerToken;
}
export class OTypeMark extends ObjectBase {
  constructor(public parent: ObjectBase, public reference: OReference) {
    super(parent, reference.range);
  }
}
export class OAlias extends ObjectBase implements I.IHasLexerToken, I.IHasReferenceLinks {
  name: OReference[] = []; // The thing being aliased
  referenceLinks: OReference[] = [];
  aliasReferences: OAlias[]; // Not used. (Because recursive aliases are not allowed)
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

export class OConfiguration extends ObjectBase implements I.IHasLibraries {
  identifier: OLexerToken;
  entityName: OLexerToken;
  libraries: OLibrary[] = [];
}
// Returns all object visible starting from the startObjects scope.
// The second parameter defines if the object is directly visible.
export function* scope(startObject: ObjectBase): Generator<[ObjectBase, boolean]> {
  let current = startObject;
  let directlyVisible = true;
  while (true) {
    yield [current, directlyVisible];
    if (current instanceof OArchitecture && current.correspondingEntity) {
      directlyVisible = false;
      yield [current.correspondingEntity, directlyVisible];
    }
    if (current instanceof OPackageBody && current.correspondingPackage) {
      directlyVisible = false;
      yield [current.correspondingPackage, directlyVisible];
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