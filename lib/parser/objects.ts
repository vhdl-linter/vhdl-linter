import { Position, Range, TextEdit } from 'vscode-languageserver';
import { OLexerToken } from '../lexer';
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
  copyWithNewStart(newStart: OI | number) {
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
        throw new ParserError('Maximum Iteraction Counter overrung', range);
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
export interface IHasUseClauses {
  useClauses: OUseClause[];
  packageDefinitions: OPackage[];
}
export interface IHasLexerToken {
  lexerToken: OLexerToken;
}
export interface IHasReferenceToken {
  referenceToken: OLexerToken;
}

export function implementsIHasUseClause(obj: ObjectBase): obj is ObjectBase & IHasUseClauses {
  return (obj as ObjectBase & IHasUseClauses).useClauses !== undefined;
}
export function implementsIHasLexerToken(obj: ObjectBase): obj is ObjectBase & IHasLexerToken {
  return (obj as ObjectBase & IHasLexerToken).lexerToken !== undefined;
}
export function implementsIHasReferenceToken(obj: ObjectBase): obj is ObjectBase & IHasReferenceToken {
  return (obj as ObjectBase & IHasReferenceToken).referenceToken !== undefined;
}
export interface IHasContextReference {
  contextReferences: OContextReference[];
  packageDefinitions: OPackage[];

}
export function implementsIHasContextReference(obj: ObjectBase): obj is ObjectBase & IHasContextReference {
  return (obj as ObjectBase & IHasContextReference).contextReferences !== undefined;
}
export interface IReferenceable {
  references: OReference[];
  aliasReferences: OAlias[];
}
export function implementsIReferencable(obj: ObjectBase): obj is ObjectBase & IReferenceable {
  return (obj as ObjectBase & IReferenceable).references !== undefined
    && (obj as ObjectBase & IReferenceable).aliasReferences !== undefined;
}
export interface IHasDefinitions {
  definitions: ObjectBase[];
}
export function implementsIHasDefinitions(obj: ObjectBase): obj is ObjectBase & IHasDefinitions {
  return (obj as ObjectBase & IHasDefinitions).definitions !== undefined;
}
export function implementsIHasPackageInstantiations(obj: ObjectBase): obj is ObjectBase & IHasPackageInstantiations {
  return (obj as ObjectBase & IHasPackageInstantiations).packageInstantiations !== undefined;
}
export interface IHasPackageInstantiations {
  packageInstantiations: OPackageInstantiation[];
}
export interface IHasSubprograms {
  subprograms: OSubprogram[];
}
export function implementsIHasSubprograms(obj: ObjectBase): obj is ObjectBase & IHasSubprograms {
  return (obj as ObjectBase & IHasSubprograms).subprograms !== undefined;
}
export interface IHasTypes {
  types: OType[];
}
export function implementsIHasTypes(obj: ObjectBase): obj is ObjectBase & IHasTypes {
  return (obj as ObjectBase & IHasTypes).types !== undefined;
}
export interface IHasAliases {
  aliases: OAlias[];
}
export function implementsIHasAliases(obj: ObjectBase): obj is ObjectBase & IHasAliases {
  return (obj as ObjectBase & IHasAliases).aliases !== undefined;
}
export interface IHasComponents {
  components: OComponent[];
}
export function implementsIHasComponents(obj: ObjectBase): obj is ObjectBase & IHasComponents {
  return (obj as ObjectBase & IHasComponents).components !== undefined;
}
export interface IHasInstantiations {
  instantiations: OInstantiation[];
}
export function implementsIHasInstantiations(obj: ObjectBase): obj is ObjectBase & IHasInstantiations {
  return (obj as ObjectBase & IHasInstantiations).instantiations !== undefined;
}
export interface IHasSignals {
  signals: OSignal[];
}
export interface IHasFileVariables {
  files: OFileVariable[];
}
export function implementsIHasFileVariables(obj: ObjectBase): obj is ObjectBase & IHasFileVariables {
  return (obj as ObjectBase & IHasFileVariables).files !== undefined;
}
export function implementsIHasSignals(obj: ObjectBase): obj is ObjectBase & IHasSignals {
  return (obj as ObjectBase & IHasSignals).signals !== undefined;
}
export interface IHasConstants {
  constants: OConstant[];
}
export function implementsIHasConstants(obj: ObjectBase): obj is ObjectBase & IHasConstants {
  return (obj as ObjectBase & IHasConstants).constants !== undefined;
}
export interface IHasVariables {
  variables: OVariable[];
}
export function implementsIHasVariables(obj: ObjectBase): obj is ObjectBase & IHasVariables {
  return (obj as ObjectBase & IHasVariables).variables !== undefined;
}
interface IHasLibraries {
  libraries: OLibrary[];
}
export function implementsIHasLibraries(obj: ObjectBase): obj is ObjectBase & IHasLibraries {
  return (obj as ObjectBase & IHasLibraries).libraries !== undefined;
}
interface IHasLibraryReference {
  library?: OLexerToken;
}
export function implementsIHasLibraryReference(obj: ObjectBase): obj is ObjectBase & IHasLibraryReference {
  return (obj as ObjectBase & IHasLibraryReference).library !== undefined;
}
export class OGeneric extends ObjectBase implements IHasDefinitions {
  reads: ORead[] = [];
  definitions: (OGeneric | OPackage)[] = [];
  references: OReference[] = [];
  aliasReferences: OAlias[] = [];
  lexerToken: OLexerToken;
}
export class OGenericConstant extends OGeneric implements IVariableBase {
  definitions: OGenericConstant[] = [];
  type: ORead[] = [];
  defaultValue?: ORead[] = [];
  reads: ORead[] = [];

}
export class OReference extends ObjectBase implements IHasDefinitions, IHasReferenceToken {
  definitions: ObjectBase[] = [];
  constructor(public parent: ObjectBase, public referenceToken: OLexerToken) {
    super(parent, referenceToken.range);
  }
}
interface IHasGenerics {
  generics: OGeneric[];
  genericRange?: OIRange;
}
export function implementsIHasGenerics(obj: ObjectBase): obj is ObjectBase & IHasGenerics {
  return (obj as ObjectBase & IHasGenerics).generics !== undefined;
}
export interface IHasPorts {
  ports: OPort[];
  portRange?: OIRange;
}
export function implementsIHasPorts(obj: ObjectBase): obj is ObjectBase & IHasPorts {
  return (obj as ObjectBase & IHasPorts).ports !== undefined;
}
export class OFile {
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
  readonly rootFile = this; // Provided as a convience to equalize to ObjectBase
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

export class OInterfacePackage extends OGeneric implements IReferenceable, IHasUseClauses, IHasContextReference, IHasLibraries, IHasLexerToken, IHasDefinitions {
  aliasReferences: OAlias[] = [];
  lexerToken: OLexerToken;
  uninstantiatedPackageToken: OLexerToken;
  definitions: OPackage[] = [];
  genericAssociationList?: OGenericAssociationList;
  references: OReference[] = [];
  libraries: OLibrary[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
}
export class OPackageInstantiation extends ObjectBase implements IReferenceable, IHasUseClauses, IHasContextReference, IHasLibraries, IHasLexerToken, IHasDefinitions {
  aliasReferences: OAlias[] = [];
  lexerToken: OLexerToken;
  uninstantiatedPackageToken: OLexerToken;
  definitions: OPackage[] = [];
  genericAssociationList?: OGenericAssociationList;
  references: OReference[] = [];
  libraries: OLibrary[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
}

export class OPackage extends ObjectBase implements IHasSubprograms, IHasComponents, IHasSignals, IHasConstants,
  IHasVariables, IHasTypes, IHasAliases, IHasFileVariables, IHasUseClauses, IHasContextReference, IHasLexerToken,
  IHasLibraries, IHasLibraryReference, IHasGenerics {
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

export class OPackageBody extends ObjectBase implements IHasSubprograms, IHasConstants, IHasVariables, IHasTypes,
  IHasAliases, IHasFileVariables, IHasUseClauses, IHasContextReference, IHasLexerToken, IHasLibraries {
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


export class OLibrary extends ObjectBase implements IHasLexerToken {
  constructor(public parent: ObjectBase | OFile, public lexerToken: OLexerToken) {
    super(parent, lexerToken.range);
  }
}

export class OContextReference extends ObjectBase implements IHasLibraryReference {
  constructor(public parent: OContext | ObjectBase, range: OIRange, public library: OLexerToken, public contextName: string) {
    super(parent, range);
  }
  definitions: ObjectBase[] = [];

}

export class OContext extends ObjectBase implements IHasUseClauses, IHasContextReference, IHasLexerToken, IHasLibraries {
  parent: OFile;
  lexerToken: OLexerToken;
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
  libraries: OLibrary[] = [];
}
export type OConcurrentStatements = OProcess | OInstantiation | OIfGenerate | OForGenerate | OBlock | OAssignment;
export class OHasConcurrentStatements extends ObjectBase {
}

export class OArchitecture extends ObjectBase implements IHasSubprograms, IHasComponents, IHasInstantiations,
  IHasSignals, IHasConstants, IHasVariables, IHasTypes, IHasAliases, IHasFileVariables, IHasUseClauses, IHasContextReference,
  IHasPackageInstantiations, IHasLexerToken, IHasLibraries, IReferenceable {
  references: OReference[] = [];
  lexerToken: OLexerToken;
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
  entityName?: OLexerToken;
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
    const generates: OArchitecture[] = this.forGenerates;
    for (const ifObj of this.ifGenerates) {
      generates.push(...ifObj.ifGenerates);
      if (ifObj.elseGenerate) {
        generates.push(ifObj.elseGenerate);
      }
    }
    return generates;
  }
}
export class OBlock extends OArchitecture {
  label: OLexerToken;
  guardCondition?: ORead[];
}
export class OType extends ObjectBase implements IReferenceable, IHasSubprograms, IHasSignals, IHasConstants, IHasVariables,
  IHasTypes, IHasAliases, IHasFileVariables, IHasUseClauses, IHasLexerToken, IHasPackageInstantiations {
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
  references: OReference[] = [];
  units?: string[] = [];
  reads: ORead[] = [];
  alias = false;
  lexerToken: OLexerToken;
  protected = false;
  protectedBody = false;
  addReadsToMap(map: Map<string, ObjectBase>) {
    map.set(this.lexerToken.getLText(), this);

    if (this.units) {
      for (const unit of this.units) {
        map.set(unit.toLowerCase(), this);

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
  superType: ORead;
  reads: ORead[] = [];
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
export class OEnumLiteral extends ObjectBase implements IReferenceable, IHasLexerToken {
  references: OReference[] = [];
  public parent: OEnum;
  public lexerToken: OLexerToken;
  aliasReferences: OAlias[] = [];

}
export class OForGenerate extends OArchitecture {
  constructor(public parent: OArchitecture,
    range: OIRange,
    public variableRange: ORead[],
  ) {
    super(parent, range);
  }
}
export class OCaseGenerate extends ObjectBase {
  signal: ORead[] = [];
  whenGenerates: OWhenGenerateClause[] = [];
}
export class OWhenGenerateClause extends OArchitecture {
  condition: ORead[] = [];
  public parent: OCaseGenerate;
}
export class OIfGenerate extends ObjectBase {
  constructor(public parent: ObjectBase | OFile, public range: OIRange, public label: OLexerToken) {
    super(parent, range);
  }
  ifGenerates: OIfGenerateClause[] = [];
  elseGenerate: OElseGenerateClause;
}
export class OIfGenerateClause extends OArchitecture {
  conditions: OLexerToken[] = [];
  conditionReads: ORead[] = [];
  public parent: OIfGenerate;
}
export class OElseGenerateClause extends OArchitecture {
  public parent: OIfGenerate;

}

interface IHasType {
  type: ORead[];
}
interface IHasDefaultValue {
  defaultValue?: ORead[];
}
interface IVariableBase extends IReferenceable, IHasLexerToken, IHasType, IHasDefaultValue {
  lexerToken: OLexerToken;
}

export class OFileVariable extends ObjectBase implements IVariableBase {
  aliasReferences: OAlias[] = [];

  references: OReference[] = [];
  type: ORead[] = [];
  defaultValue?: ORead[] = [];
  lexerToken: OLexerToken;
  openKind?: ORead[];
  logicalName?: ORead[];
  constructor(parent: IHasFileVariables, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OVariable extends ObjectBase implements IVariableBase {
  references: OReference[] = [];
  type: ORead[] = [];
  defaultValue?: ORead[] = [];
  lexerToken: OLexerToken;
  aliasReferences: OAlias[] = [];
  shared = false;
  constructor(parent: IHasVariables, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OSignal extends ObjectBase implements IVariableBase {
  references: OReference[] = [];
  type: ORead[] = [];
  defaultValue?: ORead[] = [];
  lexerToken: OLexerToken;
  aliasReferences: OAlias[] = [];
  registerProcess?: OProcess;
  constructor(parent: (ObjectBase & IHasSignals), range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OConstant extends ObjectBase implements IVariableBase {
  references: OReference[] = [];
  type: ORead[] = [];
  defaultValue?: ORead[] = [];
  lexerToken: OLexerToken;
  aliasReferences: OAlias[] = [];

  constructor(parent: IHasConstants, range: OIRange) {
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

export class OInstantiation extends OReference implements IHasDefinitions, IHasLibraryReference {
  constructor(public parent: OArchitecture | OEntity | OProcess | OLoop | OIf, lexerToken: OLexerToken, public type: 'entity' | 'component' | 'configuration' | 'subprogram' | 'unknown' = 'unknown') {
    super(parent, lexerToken);
  }
  label?: OLexerToken;
  definitions: (OEntity | OSubprogram | OComponent | OAliasWithSignature)[] = [];
  componentName: OLexerToken;
  package?: OLexerToken;
  portAssociationList?: OPortAssociationList;
  genericAssociationList?: OGenericAssociationList;
  library?: OLexerToken;
  archIdentifier?: OLexerToken;
}
export class OAssociation extends ObjectBase implements IHasDefinitions {
  constructor(public parent: OAssociationList, range: OIRange) {
    super(parent, range);
  }
  definitions: (OPort | OGeneric | OTypeMark)[] = [];
  formalPart: OAssociationFormal[] = [];
  actualIfInput: ORead[] = [];
  actualIfOutput: [ORead[], OWrite[]] = [[], []];
  actualIfInoutput: [ORead[], OWrite[]] = [[], []];
}
export class OEntity extends ObjectBase implements IHasDefinitions, IHasSubprograms, IHasSignals, IHasConstants, IHasVariables,
  IHasTypes, IHasAliases, IHasFileVariables, IHasUseClauses, IHasContextReference, IHasLexerToken, IHasPackageInstantiations, IHasLibraries, IHasGenerics, IHasPorts, IReferenceable {
  constructor(public parent: OFile, range: OIRange, public targetLibrary?: string) {
    super(parent, range);
  }
  references: OReference[] = [];
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
export class OComponent extends ObjectBase implements IHasDefinitions, IHasSubprograms, IHasLexerToken, IHasPackageInstantiations, IHasPorts, IHasGenerics {
  constructor(parent: IHasComponents, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
  lexerToken: OLexerToken;
  subprograms: OSubprogram[] = [];
  packageInstantiations: OPackageInstantiation[] = [];
  portRange?: OIRange;
  genericRange?: OIRange;
  ports: OPort[] = [];
  generics: OGeneric[] = [];
  references: OReference[] = [];
  definitions: OEntity[] = [];
}
export class OPort extends ObjectBase implements IVariableBase, IHasDefinitions, IHasLexerToken {
  direction: 'in' | 'out' | 'inout';
  directionRange: OIRange;
  definitions: OPort[] = [];
  lexerToken: OLexerToken;
  references: OReference[] = [];
  type: ORead[] = [];
  defaultValue?: ORead[] = [];
  aliasReferences: OAlias[] = [];
  registerProcess?: OProcess;
}

export type OSequentialStatement = OCase | OAssignment | OIf | OLoop | OInstantiation | OReport | OAssertion | OExit;
export class OIf extends ObjectBase {
  clauses: OIfClause[] = [];
  else?: OElseClause;
}
export class OHasSequentialStatements extends ObjectBase implements IHasInstantiations {
  statements: OSequentialStatement[] = [];
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
export class OIfClause extends OHasSequentialStatements implements IHasInstantiations {
  condition: OLexerToken[];
  conditionReads: ORead[] = [];
}
export class OCase extends ObjectBase {
  variable: ORead[] = [];
  whenClauses: OWhenClause[] = [];
}
export class OWhenClause extends OHasSequentialStatements implements IHasInstantiations {
  condition: ORead[] = [];
}
export class OProcess extends OHasSequentialStatements implements IHasSubprograms, IHasInstantiations, IHasConstants, IHasVariables,
  IHasTypes, IHasAliases, IHasFileVariables, IHasUseClauses {
  aliases: OAlias[] = [];
  packageInstantiations: OPackageInstantiation[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  sensitivityList: ORead[] = [];
  label?: OLexerToken;
  types: OType[] = [];
  subprograms: OSubprogram[] = [];
  variables: OVariable[] = [];
  files: OFileVariable[] = [];
  constants: OConstant[] = [];
  resetClause?: OIfClause;
  registerProcess = false;
  private resets: string[] | null = null;
  getResets(): string[] {
    if (this.resets !== null) {
      return this.resets;
    }
    this.resets = [];
    if (!this.registerProcess) {
      return this.resets;
    }
    for (const assignments of this.resetClause?.assignments ?? []) {
      this.resets.push(...assignments.writes.map(write => write.referenceToken.text));
    }
    return this.resets;
  }
}

export class OLoop extends OHasSequentialStatements implements IHasInstantiations {
}
export class OForLoop extends OLoop implements IHasConstants {
  constants: OConstant[] = [];
  constantRange: ORead[] = [];
}
export class OWhileLoop extends OLoop {
  conditionReads: ORead[] = [];
}
export class OAssignment extends ObjectBase {
  writes: OWrite[] = [];
  reads: ORead[] = [];
}
export class OExit extends ObjectBase {
  reads: ORead[] = [];
  labelReference?: OReference;
}

export class OReport extends ObjectBase {
  reads: ORead[] = [];
}
export class OReturn extends ObjectBase {
  reads: ORead[] = [];
}
export class OAssertion extends ObjectBase {
  reads: ORead[] = [];
}

export class OWrite extends OReference {
  // Workaround for checking of OWrites in associations. Because of overloading they can not be correctly checked.
  // This avoid false positives
  public inAssociation = false;
  private type = 'OWrite'; // Make sure typescript type checking does not accept OReference as OWrite
}
export class ORead extends OReference {
  private type = 'ORead'; // Make sure typescript type checking does not accept OReference as ORead
}
export class OUseClause extends ORead implements IHasLibraryReference {
  constructor(public parent: ObjectBase, public library: OLexerToken | undefined, public packageName: OLexerToken, public suffix: OLexerToken) {
    super(parent, packageName);
  }
}
export class OSelectedNameRead extends ORead {
  constructor(public parent: ObjectBase, public lexerToken: OLexerToken, public prefixTokens: OLexerToken[]) {
    super(parent, lexerToken);
  }
}
export class OAttributeRead extends ORead {
  constructor(public parent: ObjectBase, public lexerToken: OLexerToken, public prefixToken: OLexerToken) {
    super(parent, lexerToken);
  }
}
export class OAssociationFormal extends ObjectBase implements IHasDefinitions, IHasLexerToken {
  definitions: (OPort | OGeneric | OTypeMark)[] = [];
  constructor(public parent: OAssociation, public lexerToken: OLexerToken) {
    super(parent, lexerToken.range);
  }
}
export class OAssociationFormalSelectedName extends OAssociationFormal {
  constructor(public parent: OAssociation, public lexerToken: OLexerToken, public prefixTokens: OLexerToken[]) {
    super(parent, lexerToken);
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
export class OSubprogram extends OHasSequentialStatements implements IReferenceable, IHasSubprograms, IHasInstantiations, IHasPorts,
  IHasVariables, IHasTypes, IHasAliases, IHasFileVariables, IHasUseClauses, IHasLexerToken, IHasPackageInstantiations, IHasConstants {
  hasBody = false;

  aliasReferences: OAlias[] = [];
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  parent: OPackage;
  packageInstantiations: OPackageInstantiation[] = [];
  references: OReference[] = [];
  aliases: OAlias[] = [];
  variables: OVariable[] = [];
  files: OFileVariable[] = [];
  constants: OConstant[] = [];
  ports: OPort[] = [];
  types: OType[] = [];
  subprograms: OSubprogram[] = [];
  return: ORead[] = [];
  lexerToken: OLexerToken;
}
export class OTypeMark extends ObjectBase {
  constructor(public parent: ObjectBase, public reads: ORead[]) {
    super(parent, reads[0].range);
  }
}
export class OAlias extends ObjectBase implements IHasLexerToken {
  name: ORead[] = []; // The thing being aliased
  references: OReference[] = [];
  aliasDefinitions: ObjectBase[] = [];
  lexerToken: OLexerToken;
  reads: ORead[] = []; // subtype_indication
}
export class OAliasWithSignature extends OAlias implements IHasLexerToken {
  typeMarks: OTypeMark[] = [];
  references: OReference[] = [];
  lexerToken: OLexerToken;
  subtypeReads: ORead[] = [];
  return: ORead[] = [];
}

export class OConfiguration extends ObjectBase implements IHasLibraries {
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
    if (implementsIHasUseClause(current)) {
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