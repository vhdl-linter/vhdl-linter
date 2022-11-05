import { Position, Range, TextEdit } from 'vscode-languageserver';
import { OLexerToken } from '../lexer';
export class OI implements Position {
  protected i_?: number;
  constructor(parent: ObjectBase | OFile, i: number)
  constructor(parent: ObjectBase | OFile, line: number, character: number)
  constructor(parent: ObjectBase | OFile, line: number, character: number, i: number)
  constructor(public parent: ObjectBase | OFile, i: number, j?: number, k?: number) {
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
      && parent instanceof OPackageBody === false) {
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

export function implementsIHasUseClause(obj: ObjectBase): obj is ObjectBase & IHasUseClauses {
  return (obj as ObjectBase & IHasUseClauses).useClauses !== undefined;
}
export function implementsIHasLexerToken(obj: ObjectBase): obj is ObjectBase & IHasLexerToken {
  return (obj as ObjectBase & IHasLexerToken).lexerToken !== undefined;
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
}
export function implementsIReferencable(obj: ObjectBase): obj is ObjectBase & IReferenceable {
  return (obj as ObjectBase & IReferenceable).references !== undefined;
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
export interface IHasSubprogramAlias {
  subprogramAliases: OSubprogramAlias[];
}
export function implementsIHasSubprogramAlias(obj: ObjectBase): obj is ObjectBase & IHasSubprogramAlias {
  return (obj as ObjectBase & IHasSubprogramAlias).subprogramAliases !== undefined;
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
interface IHasGenerics {
  generics: OGeneric[];
  genericRange?: OIRange;
}
export function implementsIHasGenerics(obj: ObjectBase): obj is ObjectBase & IHasGenerics {
  return (obj as ObjectBase & IHasGenerics).generics !== undefined;
}
interface IHasPorts {
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

export class OPackageInstantiation extends ObjectBase implements IReferenceable, IHasUseClauses, IHasContextReference, IHasLibraries, IHasLexerToken, IHasDefinitions {
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
  IHasVariables, IHasTypes, IHasSubprogramAlias, IHasFileVariables, IHasUseClauses, IHasContextReference, IHasLexerToken, IHasPackageInstantiations,
  IHasLibraries, IHasLibraryReference, IHasGenerics {
  parent: OFile;
  subprogramAliases: OSubprogramAlias[] = [];
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
  IHasSubprogramAlias, IHasFileVariables, IHasUseClauses, IHasContextReference, IHasLexerToken,
  IHasPackageInstantiations, IHasLibraries {
  lexerToken: OLexerToken;
  libraries: OLibrary[] = [];
  subprogramAliases: OSubprogramAlias[] = [];
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
export class OUseClause extends ObjectBase implements IHasLibraryReference {
  constructor(public parent: ObjectBase | OFile, range: OIRange, public library: OLexerToken | undefined, public packageName: OLexerToken, public suffix: OLexerToken) {
    super(parent, range);
  }
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
  IHasSignals, IHasConstants, IHasVariables, IHasTypes, IHasSubprogramAlias, IHasFileVariables, IHasUseClauses, IHasContextReference,
  IHasPackageInstantiations, IHasLexerToken, IHasLibraries {
  lexerToken: OLexerToken;
  useClauses: OUseClause[] = [];
  subprogramAliases: OSubprogramAlias[] = [];

  packageDefinitions: OPackage[] = [];
  contextReferences: OContextReference[] = [];
  libraries: OLibrary[] = [];
  packageInstantiations: OPackageInstantiation[] = [];
  signals: OSignal[] = [];
  constants: OConstant[] = [];
  variables: OVariable[] = [];
  files: OFileVariable[] = [];
  types: OType[] = [];
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

}
export class OType extends ObjectBase implements IReferenceable, IHasSubprograms, IHasSignals, IHasConstants, IHasVariables,
  IHasTypes, IHasSubprogramAlias, IHasFileVariables, IHasUseClauses, IHasLexerToken, IHasPackageInstantiations {
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  incomplete = false;
  packageInstantiations: OPackageInstantiation[] = [];
  types: OType[] = [];
  subprogramAliases: OSubprogramAlias[] = [];

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
  references: OReference[] = [];
  type: ORead[] = [];
  defaultValue?: ORead[] = [];
  lexerToken: OLexerToken;
  constructor(parent: IHasFileVariables, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OVariable extends ObjectBase implements IVariableBase {
  references: OReference[] = [];
  type: ORead[] = [];
  defaultValue?: ORead[] = [];
  lexerToken: OLexerToken;
  constructor(parent: IHasVariables, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OSignal extends ObjectBase implements IVariableBase {
  references: OReference[] = [];
  type: ORead[] = [];
  defaultValue?: ORead[] = [];
  lexerToken: OLexerToken;
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
export class OInstantiation extends ObjectBase implements IHasDefinitions, IHasLibraryReference {
  constructor(public parent: OArchitecture | OEntity | OProcess | OLoop | OIf, range: OIRange, public type: 'entity' | 'component' | 'configuration' | 'subprogram' | 'unknown' = 'unknown') {
    super(parent, range);
  }
  label?: OLexerToken;
  definitions: (OEntity | OSubprogram | OComponent | OSubprogramAlias)[] = []; // TODO: OType is for alias. This is slightly wrong
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
  IHasTypes, IHasSubprogramAlias, IHasFileVariables, IHasUseClauses, IHasContextReference, IHasLexerToken, IHasPackageInstantiations, IHasLibraries, IHasGenerics, IHasPorts {
  constructor(public parent: OFile, range: OIRange, public targetLibrary?: string) {
    super(parent, range);
  }
  libraries: OLibrary[] = [];
  subprogramAliases: OSubprogramAlias[] = [];

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
  references: OInstantiation[] = [];
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
  registerProcess?: OProcess;
}
export class OGeneric extends ObjectBase implements IHasDefinitions, IVariableBase {
  type: ORead[] = [];
  defaultValue?: ORead[] = [];
  reads: ORead[] = [];
  definitions: OGeneric[] = [];
  references: OReference[] = [];
  lexerToken: OLexerToken;
}
export type OSequentialStatement = OCase | OAssignment | OIf | OLoop | OInstantiation | OReport | OAssertion;
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
  IHasTypes, IHasSubprogramAlias, IHasFileVariables, IHasUseClauses, IHasPackageInstantiations {
  subprogramAliases: OSubprogramAlias[] = [];
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
      this.resets.push(...assignments.writes.map(write => write.lexerToken.text));
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

export class OReport extends ObjectBase {
  reads: ORead[] = [];
}
export class OReturn extends ObjectBase {
  reads: ORead[] = [];
}
export class OAssertion extends ObjectBase {
  reads: ORead[] = [];
}

export class OReference extends ObjectBase implements IHasDefinitions, IHasLexerToken {
  definitions: ObjectBase[] = [];

  constructor(public parent: ObjectBase, public lexerToken: OLexerToken) {
    super(parent, lexerToken.range);
  }

  elaborate() {
    const text = this.lexerToken.text;
    for (const [object, directlyVisible] of scope(this)) {
      if (implementsIHasSignals(object)) {
        for (const signal of object.signals) {
          if (signal.lexerToken.getLText() === text.toLowerCase()) {
            this.definitions.push(signal);
            signal.references.push(this);
          }
        }
      }
      if (implementsIHasConstants(object)) {
        for (const constant of object.constants) {
          if (constant.lexerToken.getLText() === text.toLowerCase()) {
            this.definitions.push(constant);
            constant.references.push(this);
          }
        }
      }
      if (implementsIHasSubprograms(object)) {
        for (const subprogram of object.subprograms) {
          if (subprogram.lexerToken.getLText() === text.toLowerCase()) {
            this.definitions.push(subprogram);
            subprogram.references.push(this);
          }
        }
      }
      if (object instanceof ObjectBase && implementsIHasTypes(object)) {
        for (const type of object.types) {
          if (type.lexerToken.getLText() === text.toLowerCase()) {
            this.definitions.push(type);
            type.references.push(this);
          }
          if (type instanceof OEnum) {
            for (const state of type.literals) {
              if (state.lexerToken.getLText() === text.toLowerCase()) {
                this.definitions.push(state);
                state.references.push(this);
              }
            }
          }
          if (type instanceof ORecord) {
            for (const child of type.children) {
              if (child.lexerToken.getLText() === text.toLowerCase()) {
                this.definitions.push(child);
                child.references.push(this);
              }
            }
          }
        }
      }
      if (implementsIHasVariables(object)) {
        for (const variable of object.variables) {
          if (variable.lexerToken.getLText() === text.toLowerCase()) {
            this.definitions.push(variable);
            variable.references.push(this);
          }
        }
      }
      if (implementsIHasFileVariables(object)) {
        for (const file of object.files) {
          if (file.lexerToken.getLText() === text.toLowerCase()) {
            this.definitions.push(file);
            file.references.push(this);
          }
        }
      }
      if (implementsIHasPorts(object)) {
        for (const port of object.ports) {
          if (port.lexerToken.getLText() === text.toLowerCase()) {
            this.definitions.push(port);
            port.references.push(this);
          }
        }
      }
      if (implementsIHasGenerics(object)) {
        for (const generic of object.generics) {
          if (generic.lexerToken.getLText() === text.toLowerCase()) {
            this.definitions.push(generic);
            generic.references.push(this);
          }
        }
      }
      if (implementsIHasPackageInstantiations(object)) {
        for (const inst of object.packageInstantiations) {
          if (inst.lexerToken?.text?.toLowerCase() === text.toLowerCase()) {
            this.definitions.push(inst);
            inst.references.push(this);
          }
        }
      }

      // package names are only referencable in direct visibility
      if (directlyVisible && (object instanceof OPackage || object instanceof OPackageBody)) {
        if (object.lexerToken && object.lexerToken.getLText() === text.toLowerCase()) {
          this.definitions.push(object);
        }
      }
      // Handling for Attributes e.g. 'INSTANCE_name or 'PATH_NAME
      // TODO: check better if actual Attribute is following
      // Possible entities (objects where attributes are valid):
      /*
        entity ✓
        architecture ✓
        configuration
        procedure✓
        function✓
        package ✓
        type ✓
        subtype ✓
        constant ✓
        signal✓
        variable✓
        component✓
        label
        literal
        units
        group
        file ✓
        property
        sequence
        */
      const relevantTypes = [
        OEntity,
        OArchitecture,
        OSubprogram, // Procedure, Function
        // OPackage, OPackageBody,
        OType,
        OSubType,
        OConstant,
        OSignal,
        OVariable,
        OComponent];
      for (const relevantType of relevantTypes) {
        if (object instanceof relevantType) {
          if (object.lexerToken && object.lexerToken.getLText() === text.toLowerCase()) {
            this.definitions.push(object);
          }
        }

      }
    }
  }
}
export class OWrite extends OReference {
}
export class ORead extends OReference {

}
export class OSelectedNameRead extends ORead {
  constructor(public parent: ObjectBase, public lexerToken: OLexerToken, public prefixTokens: OLexerToken[]) {
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
  Disable,
  Parameter
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
  IHasVariables, IHasTypes, IHasSubprogramAlias, IHasFileVariables, IHasUseClauses, IHasLexerToken, IHasPackageInstantiations, IHasConstants {
  useClauses: OUseClause[] = [];
  packageDefinitions: OPackage[] = [];
  parent: OPackage;
  packageInstantiations: OPackageInstantiation[] = [];
  references: OReference[] = [];
  subprogramAliases: OSubprogramAlias[] = [];
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
export class OSubprogramAlias extends ObjectBase implements IReferenceable, IHasLexerToken {
  typeMarks: OTypeMark[] = [];
  references: OReference[] = [];
  reads: ORead[] = []; // The thing being aliased
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