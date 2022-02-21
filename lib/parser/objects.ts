import { Position, Range, TextEdit } from 'vscode-languageserver';
import { config } from './config';

export class OI implements Position {
  private i_: number;
  constructor(public parent: ObjectBase | OFile, i: number, j?: number) {
    if (typeof j === 'undefined') {
      this.i_ = i;
    } else {
      this.position = {
        line: i,
        character: j,
      };
      this.calcI();
    }
  }
  set i(i: number) {
    this.position = undefined;
    this.i_ = i;
  }
  get i() {
    return this.i_;
  }
  private position?: Position;
  get line() {
    if (!this.position) {
      this.position = this.calcPosition();
    }
    return this.position.line;
  }
  set line(line: number) {
    if (!this.position) {
      this.position = this.calcPosition();
    }
    this.position.line = line;
    this.calcI();
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
  set character(character: number) {
    if (!this.position) {
      this.position = this.calcPosition();
    }
    this.position.character = character;
    this.calcI();
  }
  getRangeToEndLine(): OIRange {
    const start = this.i;
    const text = this.parent instanceof OFile ? this.parent.text : this.parent.getRoot().text;
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
    const lines = (this.parent instanceof OFile ? this.parent : this.parent.getRoot()).text.split('\n');
    this.i_ = lines.slice(0, this.position.line).join('\n').length + 1 + this.position.character;
  }
}
export class OIRange implements Range {
  public start: OI;
  public end: OI;
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
  setEndBacktraceWhitespace(i: number) {
    this.end.i = i - 1;
    const text = this.parent instanceof OFile ? this.parent.text : this.parent.getRoot().text;
    while (text[this.end.i].match(/\s/)) {
      this.end.i--;
    }
  }
  toJSON() {
    return Range.create(this.start, this.end);
  }
}

export class ObjectBase {
  name: OName;
  public range: OIRange;
  constructor(public parent: ObjectBase | OFile, startI: number, endI: number) {
    this.range = new OIRange(this, startI, endI);
    let maximumIterationCounter = 5000;
    let p = parent;
    while (!(p instanceof OFile)) {
      p = p.parent;
      maximumIterationCounter--;
      if (maximumIterationCounter === 0) {
        throw new ParserError('Maximum Iteraction Counter overrung', new OIRange(parent, startI, endI));
      }
    }
    p.objectList.push(this);
  }
  private root?: OFile;
  getRoot(): OFile {
    if (this.root) {
      return this.root;
    }
    let parent: any = this;
    while (parent instanceof OFile === false) {
      parent = parent.parent;
    }
    this.root = parent;
    return parent;
  }
}
export interface IMentionable {
  mentions: OToken[];
}
export function implementsIMentionable(obj: unknown): obj is IMentionable {
  return (obj as IMentionable).mentions !== undefined;
}
export interface IHasDefinitions {
  definitions: ObjectBase[];
}
export function implementsIHasDefinitions(obj: unknown): obj is IHasDefinitions {
  return (obj as IHasDefinitions).definitions !== undefined;
}
export interface IHasSubprograms {
  subprograms: OSubprogram[];
}
export function implementsIHasSubprograms(obj: unknown): obj is IHasSubprograms {
  return (obj as IHasSubprograms).subprograms !== undefined;
}
export interface IHasInstantiations {
  instantiations: OInstantiation[];
}
export function implementsIHasInstantiations(obj: unknown): obj is IHasInstantiations {
  return (obj as IHasInstantiations).instantiations !== undefined;
}
export class OFile {
  constructor(public text: string, public file: string, public originalText: string) { }
  libraries: string[] = [];
  useClauses: OUseClause[] = [];
  objectList: ObjectBase[] = [];
  contexts: OContext[] = [];
  contextReferences: OContextReference[] = [];
  magicComments: (OMagicCommentParameter | OMagicCommentDisable | OMagicCommentTodo)[] = [];
  getJSON() {
    const obj = {};
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
export class OFileWithEntity extends OFile {
  entity: OEntity;
}
export class OFileWithEntityAndArchitecture extends OFileWithEntity {
  architecture: OArchitecture;
}
export class OFileWithPackages extends OFile {
  packages: (OPackage | OPackageBody)[] = [];
}
export class OPackage extends ObjectBase implements IHasSubprograms {
  parent: OFile;
  uninstantiatedPackageName?: OName;
  subprograms: OSubprogram[] = [];
  constants: OSignal[] = [];
  types: OType[] = [];
  genericRange?: OIRange;
  generics: OGeneric[] = [];
  genericAssociationList?: OGenericAssociationList;
  library?: string;
}

export class OPackageBody extends ObjectBase implements IHasSubprograms {
  parent: OFile;
  subprograms: OSubprogram[] = [];
  constants: OSignal[] = [];
  types: OType[] = [];
  library?: string;
}
export class OUseClause extends ObjectBase {
  constructor(public parent: OFile|OContext, startI: number, endI: number, public library: string, public packageName: string, public suffix: string) {
    super(parent, startI, endI);
  }
}

export class OContextReference extends ObjectBase {
  constructor(public parent: OFile|OContext, startI: number, endI: number, public library: string, public contextName: string) {
    super(parent, startI, endI);
  }
}
export class OContext extends ObjectBase {
  parent: OFile;
  name: OName;
  useClauses: OUseClause[] = [];
  contextReferences: OContextReference[] = [];
  libraries: string[] = [];
}
export type OConcurrentStatements = OProcess | OInstantiation | OIfGenerate | OForGenerate | OBlock | OAssignment;
export class OHasConcurrentStatements extends ObjectBase {
}

export class OArchitecture extends ObjectBase implements IHasSubprograms, IHasInstantiations {
  signals: OSignal[] = [];
  types: OType[] = [];
  subprograms: OSubprogram[] = [];
  components: OEntity[] = [];
  statements: OConcurrentStatements[] = [];

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
export class OType extends ObjectBase implements IMentionable, IHasSubprograms {
  types: OType[] = [];
  subprograms: OSubprogram[] = [];
  mentions: OToken[] = [];
  units?: string[] = [];
  reads: ORead[] = [];
  signals: OSignal[] = [];
  findRead(read: ORead) {
    if (this.name.text.toLowerCase() === read.text.toLowerCase()) {
      return this;
    }
    if (this.units) {
      for (const unit of this.units) {
        if (unit.toLowerCase() === read.text.toLowerCase()) {
          return this;
        }

      }
    }
    if (this instanceof OEnum) {
      for (const state of this.literals) {
        if (state.name.text.toLowerCase() === read.text.toLowerCase()) {
          return state;
        }
      }
    } else if (this instanceof ORecord && read instanceof OElementRead) {
      for (const child of this.children) {
        if (child.name.text.toLowerCase() === read.text.toLowerCase()) {
          return child;
        }
      }
    }
    return false;
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
export class OEnumLiteral extends ObjectBase implements IMentionable {
  mentions: OToken[] = [];
  public parent: OEnum;
}
export class OForGenerate extends OArchitecture {
  public variable: OVariable;
  constructor(public parent: OArchitecture,
    startI: number,
    endI: number,
    public variableRange: ORead[],
  ) {
    super(parent, startI, endI);
  }
}
export class OIfGenerate extends ObjectBase {
  ifGenerates: OIfGenerateClause[] = [];
  elseGenerate: OElseGenerateClause;
}
export class OIfGenerateClause extends OArchitecture {
  conditions: string[] = [];
  conditionReads: ORead[] = [];
  public parent: OIfGenerate;
}
export class OElseGenerateClause extends OArchitecture {
  public parent: OIfGenerate;

}

export class OName extends ObjectBase {
  text: string;
  public parent: ObjectBase;
  toString() {
    return this.text;
  }
}
export abstract class OVariableBase extends ObjectBase implements IMentionable {
  mentions: OToken[] = [];
  type: ORead[] = [];
  defaultValue?: ORead[] = [];
}
export abstract class OSignalBase extends OVariableBase {
  registerProcess?: OProcess;
  constructor(public parent: OArchitecture | OEntity | OPackage | OPackageBody | OProcess | OForLoop | OSubprogram | OType, startI: number, endI: number) {
    super(parent, startI, endI);
    let pos = new OIRange(parent, startI, endI);
    if (config.debug) {
      console.log(`${this.constructor.name}:   at ${pos.start.line}:${pos.start.character})`);
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
        throw new ParserError('Maximum Iteraction Counter overrung', new OIRange(parent, startI, endI));

      }
    }
  }
}
export class OVariable extends OVariableBase {
  type: ORead[] = [];
  constant: boolean;

}
export class OSignal extends OSignalBase {
  constant: boolean;
}
export class OAssociationList extends ObjectBase {
  public children: OAssociation[] = [];

}
export class OGenericAssociationList extends OAssociationList {
  constructor(public parent: OInstantiation | OPackage, startI: number, endI: number) {
    super(parent, startI, endI);
  }
}
export class OPortAssociationList extends OAssociationList {
  constructor(public parent: OInstantiation | OPackage, startI: number, endI: number) {
    super(parent, startI, endI);
  }
}
export class OInstantiation extends ObjectBase implements IHasDefinitions {
  constructor(public parent: OArchitecture | OEntity | OProcess | OLoop | OIf, startI: number, endI: number, public type: 'entity' | 'component' | 'procedure' | 'procedure-call') {
    super(parent, startI, endI);
  }
  label?: string;
  definitions: (OEntity | OSubprogram)[] = [];
  componentName: OName;
  portAssociationList?: OPortAssociationList;
  genericAssociationList?: OGenericAssociationList;
  library?: string;
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
              if (part.text.toLowerCase() === port.name.text.toLowerCase()) {
                return true;
              }
            }
            return false;
          });
          if (entityPort && (entityPort.direction === 'in' || entityPort.direction === 'inout')) {
            this.flatReads.push(...portAssociation.actualIfInput);
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
              if (part.text.toLowerCase() === port.name.text.toLowerCase()) {
                return true;
              }
            }
            return false;
          });
          if (entityPort && (entityPort.direction === 'out' || entityPort.direction === 'inout')) {
            this.flatWrites.push(...association.actualIfOutput[1]);
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
  constructor(public parent: OAssociationList, startI: number, endI: number) {
    super(parent, startI, endI);
  }
  definitions: (OPort | OGeneric)[] = [];
  formalPart: OAssociationFormal[] = [];
  actualIfInput: ORead[] = [];
  actualIfOutput: [ORead[], OWrite[]] = [[], []];
}
export class OEntity extends ObjectBase implements IHasDefinitions, IHasSubprograms {
  constructor(public parent: OFileWithEntity | OArchitecture, startI: number, endI: number, public library?: string) {
    super(parent, startI, endI);
  }
  portRange?: OIRange;
  genericRange?: OIRange;
  ports: OPort[] = [];
  generics: OGeneric[] = [];
  signals: OSignal[] = [];
  subprograms: OSubprogram[] = [];
  types: OType[] = [];
  mentions: OInstantiation[] = [];
  statements: (OProcess | OAssignment)[] = [];
  definitions: OEntity[] = [];
}
export class OPort extends OSignalBase {
  direction: 'in' | 'out' | 'inout';
  directionRange: OIRange;
}
export class OGeneric extends OVariableBase {
  type: ORead[] = [];
  defaultValue?: ORead[] = [];
  reads: ORead[] = [];
}
export type OSequentialStatement = OCase | OAssignment | OIf | OLoop | OInstantiation;
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
  condition: string;
  conditionReads: ORead[] = [];
}
export class OCase extends ObjectBase {
  variable: ORead[] = [];
  whenClauses: OWhenClause[] = [];
}
export class OWhenClause extends OHasSequentialStatements implements IHasInstantiations {
  condition: ORead[] = [];
}
export class OProcess extends OHasSequentialStatements implements IHasSubprograms, IHasInstantiations {
  sensitivityList: ORead[] = [];
  label?: string;
  types: OType[] = [];
  subprograms: OSubprogram[] = [];
  variables: OVariable[] = [];
  resetClause?: OIfClause;
  registerProcess: boolean = false;
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
      this.resets.push(...assignments.writes.map(write => write.text));
    }
    return this.resets;
  }
}

export class OLoop extends OHasSequentialStatements implements IHasInstantiations {
}
export class OForLoop extends OLoop {
  variable: OVariable;
  variableRange: ORead[] = [];
}
export class OWhileLoop extends OLoop {
  conditionReads: ORead[] = [];
}
export class OAssignment extends ObjectBase {
  writes: OWrite[] = [];
  reads: ORead[] = [];
}

export class OToken extends ObjectBase implements IHasDefinitions {
  definitions: ObjectBase[] = [];

  public scope?: OArchitecture | OProcess | OEntity | OForLoop | OSubprogram | OPackage | OPackageBody;
  constructor(public parent: ObjectBase, startI: number, endI: number, public text: string) {
    super(parent, startI, endI);
    let object: (OFile | ObjectBase) = this;

    do {
      object = object.parent;
      if (object instanceof OArchitecture
        || object instanceof OEntity) {
        for (const signal of object.signals) {
          if (signal.name.text.toLowerCase() === text.toLowerCase()) {
            this.definitions.push(signal);
            this.scope = object;
            signal.mentions.push(this);
          }
        }
      }
      if (object instanceof OPackage
        || object instanceof OPackageBody) {
        for (const constant of object.constants) {
          if (constant.name.text.toLowerCase() === text.toLowerCase()) {
            this.definitions.push(constant);
            this.scope = object;
            constant.mentions.push(this);
          }
        }
      }
      if (object instanceof OPackage
        || object instanceof OPackageBody
        || object instanceof OSubprogram
        || object instanceof OArchitecture
        || object instanceof OEntity
        || object instanceof OProcess
      ) {
        for (const subprogram of object.subprograms) {
          if (subprogram.name.text.toLowerCase() === text.toLowerCase()) {
            this.definitions.push(subprogram);
            this.scope = object;
            subprogram.mentions.push(this);
          }
        }
        for (const type of object.types) {
          if (type.name.text.toLowerCase() === text.toLowerCase()) {
            this.definitions.push(type);
            this.scope = object;
            type.mentions.push(this);
          }
          if (type instanceof OEnum) {
            for (const state of type.literals) {
              if (state.name.text.toLowerCase() === text.toLowerCase()) {
                this.definitions.push(state);
                this.scope = object;
                state.mentions.push(this);
              }
            }
          }
          if (type instanceof ORecord) {
            for (const child of type.children) {
              if (child.name.text.toLowerCase() === text.toLowerCase()) {
                this.definitions.push(child);
                this.scope = object;
                child.mentions.push(this);
              }
            }
          }
        }
      }
      if (object instanceof OProcess
        || object instanceof OSubprogram) {
        for (const variable of object.variables) {
          if (variable.name.text.toLowerCase() === text.toLowerCase()) {
            this.definitions.push(variable);
            this.scope = object;
            variable.mentions.push(this);
          }
        }
      }
      if (object instanceof OSubprogram
        || object instanceof OEntity) {
        for (const port of object.ports) {
          if (port.name.text.toLowerCase() === text.toLowerCase()) {
            this.definitions.push(port);
            this.scope = object;
            port.mentions.push(this);
          }
        }
      }
      if (object instanceof OForLoop
        || object instanceof OForGenerate) {
        if (object.variable.name.text.toLowerCase() === text.toLowerCase()) {
          this.definitions.push(object.variable);
          this.scope = object;
          object.variable.mentions.push(this);
        }
      }
      if (object instanceof OEntity) {
        for (const generic of object.generics) {
          if (generic.name.text.toLowerCase() === text.toLowerCase()) {
            this.definitions.push(generic);
            this.scope = object;
            generic.mentions.push(this);
          }
        }
      }
      if (object instanceof OFileWithEntity) {
        for (const signal of object.entity.signals) {
          if (signal.name.text.toLowerCase() === text.toLowerCase()) {
            this.definitions.push(signal);
            signal.mentions.push(this);
            this.scope = object.entity;
          }
        }
        for (const type of object.entity.types) {
          if (type.name.text.toLowerCase() === text.toLowerCase()) {
            this.definitions.push(type);
            type.mentions.push(this);
            this.scope = object.entity;
          }
        }
        for (const subprogram of object.entity.subprograms) {
          if (subprogram.name.text.toLowerCase() === text.toLowerCase()) {
            this.definitions.push(subprogram);
            this.scope = object.entity;
            subprogram.mentions.push(this);
          }
        }
        for (const port of object.entity.ports) {
          if (port.name.text.toLowerCase() === text.toLowerCase()) {
            this.definitions.push(port);
            this.scope = object.entity;
            port.mentions.push(this);
          }
        }
        for (const generic of object.entity.generics) {
          if (generic.name.text.toLowerCase() === text.toLowerCase()) {
            this.definitions.push(generic);
            this.scope = object.entity;
            generic.mentions.push(this);
          }
        }
      }


    } while (!(object instanceof OFile));

  }
}
export class OWrite extends OToken {
}
export class ORead extends OToken {

}
// Read of Record element or something
export class OElementRead extends ORead {
  constructor(public parent: ObjectBase, startI: number, endI: number, public text: string) {
    super(parent, startI, endI, text);
  }
}
export class OAssociationFormal extends ObjectBase implements IHasDefinitions {
  definitions: (OPort | OGeneric)[] = [];
  constructor(public parent: OAssociation, startI: number, endI: number, public text: string) {
    super(parent, startI, endI);
  }
}
export class ParserError extends Error {
  constructor(message: string, public range: OIRange, public solution?: { message: string, edits: TextEdit[] }) {
    super(message);
  }
}
export enum MagicCommentType {
  Disable,
  Parameter,
  Todo
}
export class OMagicComment extends ObjectBase {
  constructor(public parent: OFile, public commentType: MagicCommentType, range: OIRange) {
    super(parent, range.start.i, range.end.i);
  }
}
export class OMagicCommentDisable extends OMagicComment {
  constructor(public parent: OFile, public commentType: MagicCommentType.Disable, range: OIRange) {
    super(parent, commentType, range);
  }
}
export class OMagicCommentTodo extends OMagicComment {
  public message: string;
  constructor(public parent: OFile, public commentType: MagicCommentType.Todo, range: OIRange, message: string) {
    super(parent, commentType, range);
    this.message = message;
  }
}
export class OMagicCommentParameter extends OMagicComment {
  constructor(public parent: OFile, public commentType: MagicCommentType.Parameter, range: OIRange, public parameter: string[]) {
    super(parent, commentType, range);
  }
}
export class OSubprogram extends OHasSequentialStatements implements IMentionable, IHasSubprograms, IHasInstantiations {
  parent: OPackage;
  mentions: OToken[] = [];
  variables: OVariable[] = [];
  ports: OPort[] = [];
  types: OType[] = [];
  subprograms: OSubprogram[] = [];
  return: ORead[] = [];
}