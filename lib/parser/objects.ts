import { Position, Range, TextEdit } from 'vscode-languageserver';
import { config } from './config';
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
    const text = this.parent.getRoot().text;
    let end = text.length;
    const match = /\n/.exec(text.substr(start));
    if (match) {
      end = start + match.index;
    }
    return new OIRange(this.parent, start, end);

  }
  private calcPosition(): Position {
    const lines = (this.parent instanceof OFile ? this.parent : this.parent.getRoot()).text.slice(0, this.i).split('\n');
    const line = lines.length - 1;
    const character = lines[lines.length - 1].length;
    return { character, line };
  }
  private calcI() {
    if (typeof this.position === 'undefined') {
      throw new Error('Something went wrong with OIRange');
    }
    const lines = (this.parent instanceof OFile ? this.parent : this.parent.getRoot()).lines;
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
    const lines = (this.parent instanceof OFile ? this.parent : this.parent.getRoot()).lines;
    let startCol = 0;
    const match = lines[this.start.line].match(/\S/);
    if (match) {
      startCol = match.index ?? 0;
    }
    const newStart = new OI(this.parent, this.start.line, startCol);

    return new OIRange(this.parent, newStart, this.end);

  }
  copyExtendEndOfLine(): OIRange {
    const text = this.parent.getRoot().text;
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
    p.objectList.push(this);
  }
  private root?: OFile;
  getRoot(): OFile {
    if (this.root) {
      return this.root;
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias, @typescript-eslint/no-explicit-any
    let parent: any = this;
    while (parent instanceof OFile === false) {
      parent = parent.parent;
    }
    this.root = parent;
    return parent;
  }
  private rootElement?: OArchitecture | OEntity | OPackage | OPackageBody;

  getRootElement(): OArchitecture | OEntity | OPackage | OPackageBody {
    if (this.rootElement) {
      return this.rootElement;
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let parent: ObjectBase = this;
    while (parent instanceof OArchitecture === false
      && parent instanceof OEntity === false && parent instanceof OPackage === false && parent instanceof OPackageBody === false) {
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
}
export interface IHasLexerToken {
  lexerToken: OLexerToken;
}
export function implementsIHasUseClause(obj: unknown): obj is IHasUseClauses {
  return (obj as IHasUseClauses).useClauses !== undefined;
}
export function implementsIHasLexerToken(obj: unknown): obj is IHasLexerToken {
  return (obj as IHasLexerToken).lexerToken !== undefined;
}
export interface IHasContextReference {
  contextReferences: OContextReference[];
}
export function implementsIHasContextReference(obj: unknown): obj is IHasContextReference {
  return (obj as IHasContextReference).contextReferences !== undefined;
}
export interface IReferenceable {
  references: OReference[];
}
export function implementsIReferencable(obj: unknown): obj is IReferenceable {
  return (obj as IReferenceable).references !== undefined;
}
export interface IHasDefinitions {
  definitions: ObjectBase[];
}
export function implementsIHasDefinitions(obj: unknown): obj is IHasDefinitions {
  return (obj as IHasDefinitions).definitions !== undefined;
}
export function implementsIHasPackageInstantiations(obj: unknown): obj is IHasPackageInstantiations {
  return (obj as IHasPackageInstantiations).packageInstantiations !== undefined;
}
export interface IHasPackageInstantiations {
  packageInstantiations: OPackageInstantiation[];
}
export interface IHasSubprograms {
  subprograms: OSubprogram[];
}
export function implementsIHasSubprograms(obj: unknown): obj is IHasSubprograms {
  return (obj as IHasSubprograms).subprograms !== undefined;
}
export interface IHasTypes {
  types: OType[];
}
export function implementsIHasTypes(obj: unknown): obj is IHasTypes {
  return (obj as IHasTypes).types !== undefined;
}
export interface IHasComponents {
  components: OComponent[];
}
export function implementsIHasComponents(obj: unknown): obj is IHasComponents {
  return (obj as IHasComponents).components !== undefined;
}
export interface IHasInstantiations {
  instantiations: OInstantiation[];
}
export function implementsIHasInstantiations(obj: unknown): obj is IHasInstantiations {
  return (obj as IHasInstantiations).instantiations !== undefined;
}
export interface IHasSignals {
  signals: OSignal[];
}
export interface IHasFileVariables {
  files: OFileVariable[];
}
export function implementsIHasFileVariables(obj: unknown): obj is IHasFileVariables {
  return (obj as IHasFileVariables).files !== undefined;
}
export function implementsIHasSignals(obj: unknown): obj is IHasSignals {
  return (obj as IHasSignals).signals !== undefined;
}
export interface IHasConstants {
  constants: OConstant[];
}
export function implementsIHasConstants(obj: unknown): obj is IHasConstants {
  return (obj as IHasConstants).constants !== undefined;
}
export interface IHasVariables {
  variables: OVariable[];
}
export function implementsIHasVariables(obj: unknown): obj is IHasVariables {
  return (obj as IHasVariables).variables !== undefined;
}
interface IHasLibraries {
  libraries: OLexerToken[];
}
export function implementsIHasLibraries(obj: unknown): obj is IHasLibraries {
  return (obj as IHasLibraries).libraries !== undefined;

}
interface IHasLibraryReference {
  library?: OLexerToken;
}
export function implementsIHasLibraryReference(obj: unknown): obj is IHasLibraryReference {
  return (obj as IHasLibraryReference).library !== undefined;
}
interface IHasGenerics {
  generics: OGeneric[];
  genericRange?: OIRange;
}
export function implementsIHasGenerics(obj: unknown): obj is IHasGenerics {
  return (obj as IHasGenerics).generics !== undefined;
}
interface IHasPorts {
  ports: OPort[];
  portRange?: OIRange;
}
export function implementsIHasPorts(obj: unknown): obj is IHasPorts {
  return (obj as IHasPorts).ports !== undefined;
}
export class OFile {
  public lines: string[];
  constructor(public text: string, public file: string, public originalText: string) {
    this.lines = originalText.split('\n');
  }

  objectList: ObjectBase[] = [];
  contexts: OContext[] = [];
  magicComments: (OMagicCommentParameter | OMagicCommentDisable)[] = [];
  entities: OEntity[] = [];
  architectures: OArchitecture[] = [];
  packages: (OPackage | OPackageBody)[] = [];
  configurations: OConfiguration[] = [];
  getRoot() { // Provided as a convience to equalize to ObjectBase
    return this;
  }
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

export class OPackageInstantiation extends ObjectBase implements IReferenceable {
  uninstantiatedPackage: OLexerToken;
  genericAssociationList?: OGenericAssociationList;
  references: OReference[] = [];
}

export class OPackage extends ObjectBase implements IHasSubprograms, IHasComponents, IHasSignals, IHasConstants,
  IHasVariables, IHasTypes, IHasFileVariables, IHasUseClauses, IHasContextReference, IHasLexerToken, IHasPackageInstantiations,
  IHasLibraries, IHasGenerics {
  parent: OFile;
  libraries: OLexerToken[] = [];

  lexerToken: OLexerToken;
  useClauses: OUseClause[] = [];
  packageInstantiations: OPackageInstantiation[] = [];
  contextReferences: OContextReference[] = [];
  uninstantiatedPackage?: OLexerToken; // TODO: remove this
  subprograms: OSubprogram[] = [];
  components: OComponent[] = [];
  signals: OSignal[] = [];
  constants: OConstant[] = [];
  variables: OVariable[] = [];
  files: OFileVariable[] = [];
  types: OType[] = [];
  genericRange?: OIRange;
  generics: OGeneric[] = [];
  genericAssociationList?: OGenericAssociationList;
  targetLibrary?: string;
}

export class OPackageBody extends ObjectBase implements IHasSubprograms, IHasConstants, IHasVariables, IHasTypes,
  IHasFileVariables, IHasUseClauses, IHasContextReference, IHasLexerToken, IHasPackageInstantiations, IHasLibraries {
  lexerToken: OLexerToken;
  libraries: OLexerToken[] = [];

  packageInstantiations: OPackageInstantiation[] = [];
  useClauses: OUseClause[] = [];
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
  constructor(public parent: ObjectBase | OFile, range: OIRange, public library: OLexerToken, public packageName: string, public suffix: string) {
    super(parent, range);
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
  contextReferences: OContextReference[] = [];
  libraries: OLexerToken[] = [];
}
export type OConcurrentStatements = OProcess | OInstantiation | OIfGenerate | OForGenerate | OBlock | OAssignment;
export class OHasConcurrentStatements extends ObjectBase {
}

export class OArchitecture extends ObjectBase implements IHasSubprograms, IHasComponents, IHasInstantiations,
  IHasSignals, IHasConstants, IHasVariables, IHasTypes, IHasFileVariables, IHasUseClauses, IHasContextReference,
  IHasPackageInstantiations, IHasLexerToken, IHasLibraries {
  lexerToken: OLexerToken;
  useClauses: OUseClause[] = [];
  contextReferences: OContextReference[] = [];
  libraries: OLexerToken[] = [];
  packageInstantiations: OPackageInstantiation[] = [];
  signals: OSignal[] = [];
  constants: OConstant[] = [];
  variables: OVariable[] = [];
  files: OFileVariable[] = [];
  types: OType[] = [];
  subprograms: OSubprogram[] = [];
  components: OComponent[] = [];
  statements: OConcurrentStatements[] = [];
  entityName?: string;
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
    const generates = this.forGenerates as OArchitecture[];
    for (const ifObj of this.ifGenerates) {
      generates.push(...ifObj.ifGenerates);
      if (ifObj.elseGenerate) {
        generates.push(ifObj.elseGenerate);
      }
    }
    return generates as readonly OArchitecture[];
  }
}
export class OBlock extends OArchitecture {
  label: string;

}
export class OType extends ObjectBase implements IReferenceable, IHasSubprograms, IHasSignals, IHasConstants, IHasVariables,
  IHasTypes, IHasFileVariables, IHasUseClauses, IHasLexerToken, IHasPackageInstantiations {
  useClauses: OUseClause[] = [];
  incomplete = false;
  packageInstantiations: OPackageInstantiation[] = [];
  types: OType[] = [];
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

// export class OName extends ObjectBase {
//   constructor(parent: ObjectBase, range: OIRange | OLexerToken) {
//     super(parent, range instanceof OIRange ? range : range.range);
//     if (range instanceof OLexerToken) {
//       this.text = range.text;
//     }

//   }
//   text: string;
//   public parent: ObjectBase;
//   toString() {
//     return this.text;
//   }
// }
export abstract class OVariableBase extends ObjectBase implements IReferenceable, IHasLexerToken {
  references: OReference[] = [];
  type: ORead[] = [];
  defaultValue?: ORead[] = [];
  lexerToken: OLexerToken;
}
export abstract class OSignalBase extends OVariableBase {
  registerProcess?: OProcess;
  constructor(public parent: ObjectBase, range: OIRange) {
    super(parent, range);
    if (config.debug) {
      console.log(`${this.constructor.name}:   at ${range.start.line}:${range.start.character})`);
    }

    let maximumIterationCounter = 5000;
    let p: ObjectBase | OFile = parent;
    while (p instanceof ObjectBase) {
      if (p instanceof OProcess && p.registerProcess) {
        this.registerProcess = p;
        break;
      }
      p = p.parent;
      maximumIterationCounter--;
      if (maximumIterationCounter === 0) {
        throw new ParserError('Maximum Iteraction Counter overrung', range);

      }
    }
  }
}
export class OFileVariable extends OVariableBase {
  constructor(parent: IHasFileVariables, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
  type: ORead[] = [];
}
export class OVariable extends OVariableBase {
  constructor(parent: IHasVariables, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
  type: ORead[] = [];
}
export class OSignal extends OSignalBase {
  constructor(parent: IHasSignals, range: OIRange) {
    super((parent as unknown) as ObjectBase, range);
  }
}
export class OConstant extends OSignalBase {
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
  label?: string;
  definitions: (OEntity | OSubprogram | OComponent)[] = [];
  componentName: OLexerToken;
  package?: OLexerToken;
  portAssociationList?: OPortAssociationList;
  genericAssociationList?: OGenericAssociationList;
  library?: OLexerToken;
  private flatReads: ORead[] | null = null;
  private flatWrites: OWrite[] | null = null;
  getFlatReads(entity: OEntity | undefined): ORead[] {

    if (this.flatReads !== null) {
      return this.flatReads;
    }
    this.flatReads = [];
    if (this.portAssociationList) {
      for (const portAssociation of this.portAssociationList.children) {
        if (entity) {
          const entityPort = entity.ports.find(port => {
            for (const part of portAssociation.formalPart) {
              if (part.lexerToken.getLText() === port.lexerToken.getLText()) {
                return true;
              }
            }
            return false;
          });
          if (entityPort && (entityPort.direction === 'in')) {
            this.flatReads.push(...portAssociation.actualIfInput);
          } else if (entityPort && (entityPort.direction === 'inout')) {
            this.flatReads.push(...portAssociation.actualIfInoutput[0]);
          } else if (entityPort && entityPort.direction === 'out') {
            this.flatReads.push(...portAssociation.actualIfOutput[0]);
          }
        } else {
          this.flatReads.push(...portAssociation.actualIfInput);
        }
      }
    }
    if (this.genericAssociationList) {
      for (const association of this.genericAssociationList.children) {
        this.flatReads.push(...association.actualIfInput);
      }
    }
    return this.flatReads;
  }
  getFlatWrites(entity: OEntity | undefined): OWrite[] {
    //     console.log(entity, 'asd');
    if (this.flatWrites !== null) {
      return this.flatWrites;
    }
    this.flatWrites = [];
    if (this.portAssociationList) {
      for (const association of this.portAssociationList.children) {
        if (entity) {
          const entityPort = entity.ports.find(port => {
            for (const part of association.formalPart) {
              if (part.lexerToken.getLText() === port.lexerToken.getLText()) {
                return true;
              }
            }
            return false;
          });
          if (entityPort && (entityPort.direction === 'out')) {
            this.flatWrites.push(...association.actualIfOutput[1]);
          } else if (entityPort && (entityPort.direction === 'inout')) {
            this.flatWrites.push(...association.actualIfInoutput[1]);
          }
        } else {
          this.flatWrites.push(...association.actualIfInput);
        }
      }
    }
    return this.flatWrites;
  }
}
export class OAssociation extends ObjectBase implements IHasDefinitions {
  constructor(public parent: OAssociationList, range: OIRange) {
    super(parent, range);
  }
  definitions: (OPort | OGeneric)[] = [];
  formalPart: OAssociationFormal[] = [];
  actualIfInput: ORead[] = [];
  actualIfOutput: [ORead[], OWrite[]] = [[], []];
  actualIfInoutput: [ORead[], OWrite[]] = [[], []];
}
export class OEntity extends ObjectBase implements IHasDefinitions, IHasSubprograms, IHasSignals, IHasConstants, IHasVariables,
  IHasTypes, IHasFileVariables, IHasUseClauses, IHasContextReference, IHasLexerToken, IHasPackageInstantiations, IHasLibraries, IHasGenerics, IHasPorts {
  constructor(public parent: OFile, range: OIRange, public targetLibrary?: string) {
    super(parent, range);
  }
  libraries: OLexerToken[] = [];
  packageInstantiations: OPackageInstantiation[] = [];
  lexerToken: OLexerToken;
  useClauses: OUseClause[] = [];
  contextReferences: OContextReference[] = [];
  portRange?: OIRange;
  genericRange?: OIRange;
  ports: OPort[] = [];
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
export class OPort extends OSignalBase implements IHasDefinitions, IHasLexerToken {
  direction: 'in' | 'out' | 'inout';
  directionRange: OIRange;
  definitions: OPort[] = [];
  lexerToken: OLexerToken;
}
export class OGeneric extends OVariableBase implements IHasDefinitions {
  type: ORead[] = [];
  defaultValue?: ORead[] = [];
  reads: ORead[] = [];
  definitions: OGeneric[] = [];
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
  IHasTypes, IHasFileVariables, IHasUseClauses, IHasPackageInstantiations {
  packageInstantiations: OPackageInstantiation[] = [];
  useClauses: OUseClause[] = [];
  sensitivityList: ORead[] = [];
  label?: string;
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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let object: (OFile | ObjectBase) = this;
    let lastIteration = false;
    let stop = false;
    const text = this.lexerToken.text;
    do {
      stop = lastIteration;
      if (!lastIteration) {
        object = object.parent;
      }
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
        OPackage, OPackageBody,
        OType,
        OSubType,
        OConstant,
        OSignal, OSignalBase,
        OVariable,
        OComponent];
      for (const relevantType of relevantTypes) {
        if (object instanceof relevantType) {
          if (object.lexerToken && object.lexerToken.getLText() === text.toLowerCase()) {
            this.definitions.push(object);
          }
        }

      }
      if (object instanceof OArchitecture && object.correspondingEntity) {
        object = object.correspondingEntity;
        lastIteration = true;
      }
      if (object instanceof OPackageBody && object.correspondingPackage) {
        object = object.correspondingPackage;
        lastIteration = true;
      }
      // if (object instanceof OFile && object.entity) {
      //   object = object.entity;
      //   lastIteration = true;
      // }
    } while (!(object instanceof OFile || stop));
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
  definitions: (OPort | OGeneric)[] = [];
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
  constructor(public parent: OFile, public commentType: MagicCommentType, range: OIRange) {
    super(parent, range);
  }
}
export class OMagicCommentDisable extends OMagicComment {
  constructor(public parent: OFile, public commentType: MagicCommentType.Disable, range: OIRange) {
    super(parent, commentType, range);
  }
}
export class OMagicCommentParameter extends OMagicComment {
  constructor(public parent: OFile, public commentType: MagicCommentType.Parameter, range: OIRange, public parameter: string[]) {
    super(parent, commentType, range);
  }
}
export class OSubprogram extends OHasSequentialStatements implements IReferenceable, IHasSubprograms, IHasInstantiations, IHasConstants,
  IHasVariables, IHasTypes, IHasFileVariables, IHasUseClauses, IHasLexerToken, IHasPackageInstantiations, IHasPorts {
  useClauses: OUseClause[] = [];
  parent: OPackage;
  packageInstantiations: OPackageInstantiation[] = [];
  references: OReference[] = [];
  variables: OVariable[] = [];
  files: OFileVariable[] = [];
  constants: OConstant[] = [];
  ports: OPort[] = [];
  types: OType[] = [];
  subprograms: OSubprogram[] = [];
  return: ORead[] = [];
  lexerToken: OLexerToken;
}
export class OConfiguration extends ObjectBase implements IHasLibraries {
  identifier: OLexerToken;
  entityName: OLexerToken;
  libraries: OLexerToken[] = [];
}