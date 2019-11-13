import { Range, Position, TextEdit } from 'vscode-languageserver';

export class OI implements Position {
  private i_: number;
  constructor(public parent: ObjectBase|OFile, i: number) {
    this.i_ = i;
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
    return {character, line};
  }
  private calcI() {
    if (typeof this.position === 'undefined') {
      throw new Error('Something went wrong with OIRange');
    }
    const lines = (this.parent instanceof OFile ? this.parent : this.parent.getRoot()).text.split('\n');
    this.i_ = lines.slice(0, this.position.line).join('\n').length + this.position.character;
  }
}
export class OIRange implements Range {
  public start: OI;
  public end: OI;
  constructor(public parent: ObjectBase|OFile, start: number | OI, end: number | OI) {
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
  public range: OIRange;
  constructor(public parent: ObjectBase | OFile, startI: number, endI: number) {
    this.range = new OIRange(this, startI, endI);
    let p = parent;
    while (!(p instanceof OFile)) {
      p = p.parent;
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
export class OFile {
  constructor(public text: string, public file: string, public originalText: string) { }
  libraries: string[] = [];
  useStatements: OUseStatement[] = [];
  objectList: ObjectBase[] = [];
  getJSON() {
    const obj = {};
    const seen = new WeakSet();

    return JSON.stringify(this, (key, value) => {
      if (['parent', 'originalText', 'objectList', 'root'].indexOf(key) > -1) {
          return;
        }
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            debugger;
            return;
          }
          value.proto = value.constructor.name;
          seen.add(value);
        }
        return value;
    });
  }
  isValidRead(read: ORead, packages: OPackage[]): boolean {
    return this.findRead(read, packages) !== false;
  }

  findRead(read: ORead, packages: OPackage[]): ObjectBase | false {
    let found: ObjectBase | false = false;

    for (const pkg of packages) {
      for (const constant of pkg.constants) {
        if (constant.name.text.toLowerCase() === read.text.toLowerCase()) {
          return constant;
        }
      }
      for (const func of pkg.functions) {
        if (func.name.toLowerCase() === read.text.toLowerCase()) {
          return func;
        }
      }
      for (const type of pkg.types) {
        const typeRead = type.findRead(read);
        if (typeRead !== false) {
          return typeRead;
        }
        if (type instanceof OEnum) {
          for (const state of type.states) {
            if (state.name.toLowerCase() === read.text.toLowerCase()) {
              return state;
            }
          }
        } else if (type instanceof ORecord) {
          for (const child of type.children) {
            if (child.name.toLowerCase() === read.text.toLowerCase()) {
              return child;
            }
          }
        }
      }
    }

    let parent = read.parent;
    let counter = 100;
    while ((parent instanceof OFile) === false) {
      if (parent instanceof OArchitecture) {
        for (const signal of parent.signals) {
          found = found || signal.name.text.toLowerCase() === read.text.toLowerCase() && signal;
        }
        for (const func of parent.functions) {
          found = found || func.name.toLowerCase() === read.text.toLowerCase() && func;
        }
        for (const type of parent.types) {
          found = found || type.findRead(read) && type;
        }
      }
      if (parent instanceof OForLoop) {
        found = found || parent.variable.toLowerCase() === read.text.toLowerCase() && parent;
      }
      if (parent instanceof OForGenerate) {
        found = found || parent.variable.toLowerCase() === read.text.toLowerCase() && parent;
      }
      parent = (parent as any).parent;
      counter--;
      if (counter === 0) {
        //        console.log(parent, parent.parent);
        throw new Error('Infinite Loop?');
      }
    }
    if (parent instanceof OFileWithEntityAndArchitecture) {
      const file = (parent as any) as OFileWithEntityAndArchitecture;
      for (const generic of file.entity.generics) {
        found = found || generic.name.text.toLowerCase() === read.text.toLowerCase() && generic;
      }
      for (const port of file.entity.ports) {
        found = found || port.name.text.toLowerCase() === read.text.toLowerCase() && port;
      }
    } else if (parent instanceof OFileWithPackage) {
      for (const type of parent.package.types) {
        found = found || type.findRead(read) && type;
      }
      for (const constant of parent.package.constants) {
        found = found || constant.name.text.toLowerCase() === read.text.toLowerCase() && constant;
      }
      for (const func of parent.package.functions) {
        found = found || func.name.toLowerCase() === read.text.toLowerCase() && func;
      }
    }
    return found;
  }
  isValidWrite(write: OWrite): boolean {
    let found = false;
    let parent = write.parent;
    let counter = 100;
    while ((parent instanceof OFile) === false) {
      if (parent instanceof OArchitecture) {
        for (const signal of parent.signals) {
          found = found || signal.name.text.toLowerCase() === write.text.toLowerCase();
        }
      }
      parent = (parent as any).parent;
      counter--;
      if (counter === 0) {
        //        console.log(parent, parent.parent);
        throw new Error('Infinite Loop?');
      }
    }
    const file = (parent as any) as OFileWithEntityAndArchitecture;
    for (const signal of file.architecture.signals) {
      found = found || signal.name.text.toLowerCase() === write.text.toLowerCase();
    }
    for (const port of file.entity.ports) {
      found = found || port.name.text.toLowerCase() === write.text.toLowerCase();
    }
    for (const type of file.architecture.types) {
      if (type instanceof OEnum && type.states.find(state => state.name.toLowerCase() === write.text.toLowerCase())) {
        found = true;
      }
    }
    return found;
  }
}
export class OFileWithEntity extends OFile {
  entity: OEntity;
}
export class OFileWithEntityAndArchitecture extends OFileWithEntity {
  architecture: OArchitecture;
}
export class OFileWithPackage extends OFile {
  package: OPackage;
}
export class OPackage extends ObjectBase {
  name: string;
  functions: OFunction[];
  constants: OSignal[];
  types: OType[];
  parent: OFile;
  library?: string;
}
export class OUseStatement extends ObjectBase {
  text: string;
  begin: number;
  end: number;
}
export class OFunction extends ObjectBase {
  name: string;
  parameter: string;
}
export class OArchitecture extends ObjectBase {
  signals: OSignal[] = [];
  processes: OProcess[] = [];
  instantiations: OInstantiation[] = [];
  generates: OArchitecture[] = [];
  assignments: OAssignment[] = [];
  types: OType[] = [];
  functions: OFunction[] = [];
  procedures: OProcedureInstantiation[] = [];


}
export class OType extends ObjectBase {
  name: string;
  units?: string[];
  findRead(read: ORead) {
    if (this.name.toLowerCase() === read.text.toLowerCase()) {
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
      for (const state of this.states) {
        if (state.name.toLowerCase() === read.text.toLowerCase()) {
          return state;
        }
      }
    } else if (this instanceof ORecord && read instanceof OElementRead) {
      for (const child of this.children) {
        if (child.name.toLowerCase() === read.text.toLowerCase()) {
          return child;
        }
      }
    }
    return false;
  }
}
export class OEnum extends OType {
  states: OState[] = [];
}
export class ORecord extends OType {
  children: OType[];
}
export class ORecordChild extends OType {
  public parent: ORecord;
}
export class OState extends ObjectBase {
  name: string;
  public parent: OEnum;
}
export class OForGenerate extends OArchitecture {
  variable: string;
  start: string;
  end: string;
}
export class OIfGenerate extends OArchitecture {
  conditions: string[];
  conditionReads: ORead[];
}
export class OVariable extends ObjectBase {
  name: string;
  type: string;
  constant: boolean;
  defaultValue: string;

}
export class OName extends ObjectBase {
  text: string;
  toString() {
    return this.text;
  }
}
export class OSignalLike extends ObjectBase {
  type: string;
  name: OName;
  defaultValue?: ORead[];
  private register: boolean | null = null;
  private registerProcess: OProcess | null;
  reads: ORead[] = [];
  constructor(public parent: OArchitecture | OEntity | OPackage, startI: number, endI: number) {
    super(parent, startI, endI);
  }
  isRegister(): boolean {
    if (this.register !== null) {
      return this.register;
    }
    this.register = false;
    const processes = this.parent instanceof OArchitecture ? this.parent.processes : (this.parent.parent instanceof OFileWithEntityAndArchitecture ? this.parent.parent.architecture.processes : []);
    for (const process of processes) {
      if (process.isRegisterProcess()) {
        for (const write of process.getFlatWrites()) {
          if (write.text.toLowerCase() === this.name.text.toLowerCase()) {
            this.register = true;
            this.registerProcess = process;
          }
        }
      }
    }
    return this.register;
  }
  getRegisterProcess(): OProcess | null {
    if (this.isRegister === null) {
      return null;
    }
    return this.registerProcess;
  }
}
export class OSignal extends OSignalLike {
  constant: boolean;
}
export class OMap extends ObjectBase {
  public children: OMapping[] = [];
  constructor(public parent: OInstantiation, startI: number, endI: number) {
    super(parent, startI, endI);
  }
}
export class OGenericMap extends OMap {
}
export class OPortMap extends OMap {
}
export class OInstantiation extends ObjectBase {
  label?: string;
  componentName: string;
  portMappings?: OPortMap;
  genericMappings?: OGenericMap;
  library?: string;
  entityInstantiation: boolean;
  private flatReads: ORead[] | null = null;
  private flatWrites: OWrite[] | null = null;
  getFlatReads(entity: OEntity | undefined): ORead[] {
    //     console.log(entity, 'asd2');

    if (this.flatReads !== null) {
      return this.flatReads;
    }
    this.flatReads = [];
    if (this.portMappings) {
      for (const portMapping of this.portMappings.children) {
        if (entity) {
          const entityPort = entity.ports.find(port => {
            for (const part of portMapping.name) {
              if (part.text.toLowerCase() === port.name.text.toLowerCase()) {
                return true;
              }
            }
            return false;
          });
          if (entityPort && (entityPort.direction === 'in' || entityPort.direction === 'inout')) {
            this.flatReads.push(...portMapping.mappingIfInput);
          } else if (entityPort && entityPort.direction === 'out') {
            this.flatReads.push(...portMapping.mappingIfOutput[0]);
          }
        } else {
          this.flatReads.push(...portMapping.mappingIfInput);
        }
      }
    }
    if (this.genericMappings) {
      for (const portMapping of this.genericMappings.children) {
        this.flatReads.push(...portMapping.mappingIfInput);
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
    if (this.portMappings) {
      for (const portMapping of this.portMappings.children) {
        if (entity) {
          const entityPort = entity.ports.find(port => {
            for (const part of portMapping.name) {
              if (part.text.toLowerCase() === port.name.text.toLowerCase()) {
                return true;
              }
            }
            return false;
          });
          if (entityPort && (entityPort.direction === 'out' || entityPort.direction === 'inout')) {
            this.flatWrites.push(...portMapping.mappingIfOutput[1]);
          }
        } else {
          this.flatWrites.push(...portMapping.mappingIfInput);
        }
      }
    }
    return this.flatWrites;
  }
}
export class OMapping extends ObjectBase {
  constructor(public parent: OMap, startI: number, endI: number) {
    super(parent, startI, endI);
  }
  name: OMappingName[];
  mappingIfInput: ORead[];
  mappingIfOutput: [ORead[], OWrite[]];
}
export class OEntity extends ObjectBase {
  constructor(public parent: OFileWithEntity, startI: number, endI: number, public library?: string) {
    super(parent, startI, endI);
  }
  name: string;
  portRange?: OIRange;
  genericRange?: OIRange;
  ports: OPort[] = [];
  generics: OGeneric[] = [];
  signals: OSignal[] = [];
  functions: OFunction[] = [];

}
export class OPort extends OSignalLike {
  direction: 'in' | 'out' | 'inout';
  directionRange: OIRange;
}
export class OGenericType extends ObjectBase {
  name: OName;
}
export class OGenericActual extends ObjectBase {
  name: OName;
  type: string;
  defaultValue?: string;
  reads: ORead[];
}
export type OGeneric = OGenericType | OGenericActual;
export type OStatement = OCase | OAssignment | OIf | OForLoop;
export class OIf extends ObjectBase {
  clauses: OIfClause[] = [];
  else?: OElseClause;
}
export class OElseClause extends ObjectBase {
  statements: OStatement[] = [];
}
export class OIfClause extends ObjectBase {
  condition: string;
  conditionReads: ORead[];
  statements: OStatement[] = [];
}
export class OCase extends ObjectBase {
  variable: ORead[];
  whenClauses: OWhenClause[] = [];
}
export class OWhenClause extends ObjectBase {
  condition: ORead[];
  statements: OStatement[] = [];
}
export class OProcess extends ObjectBase {
  statements: OStatement[] = [];
  sensitivityList: string;
  label?: string;
  variables: OVariable[] = [];
  private registerProcess: boolean | null = null;
  isRegisterProcess(): boolean {
    if (this.registerProcess !== null) {
      return this.registerProcess;
    }

    this.registerProcess = false;
    for (const statement of this.statements) {
      if (statement instanceof OIf) {
        for (const clause of statement.clauses) {
          if (clause.condition.match(/rising_edge/i)) {
            this.registerProcess = true;
          }
        }
      }
    }
    return this.registerProcess;
  }
  private flatWrites: OWrite[] | null = null;
  getFlatWrites(): OWrite[] {
    if (this.flatWrites !== null) {
      return this.flatWrites;
    }
    const flatten = (objects: OStatement[]) => {
      const flatWrites: OWrite[] = [];
      for (const object of objects) {
        if (object instanceof OAssignment) {
          flatWrites.push(...object.writes);
        } else if (object instanceof OIf) {
          if (object.else) {
            flatWrites.push(...flatten(object.else.statements));
          }
          for (const clause of object.clauses) {
            flatWrites.push(...flatten(clause.statements));
          }
        } else if (object instanceof OCase) {
          for (const whenClause of object.whenClauses) {
            flatWrites.push(...flatten(whenClause.statements));
          }
        } else if (object instanceof OForLoop) {
          flatWrites.push(...flatten(object.statements));
        } else {
          throw new Error('UUPS');
        }


      }
      return flatWrites;
    };
    this.flatWrites = flatten(this.statements);
    return this.flatWrites;
  }
  private flatReads: ORead[] | null = null;
  getFlatReads(): ORead[] {
    if (this.flatReads !== null) {
      return this.flatReads;
    }
    const flatten = (objects: OStatement[]) => {
      const flatReads: ORead[] = [];
      for (const object of objects) {
        if (object instanceof OAssignment) {
          flatReads.push(...object.reads);
        } else if (object instanceof OIf) {
          if (object.else) {
            flatReads.push(...flatten(object.else.statements));
          }
          for (const clause of object.clauses) {
            flatReads.push(...clause.conditionReads);
            flatReads.push(...flatten(clause.statements));
          }
        } else if (object instanceof OCase) {
          flatReads.push(...object.variable);
          for (const whenClause of object.whenClauses) {
            flatReads.push(...whenClause.condition);
            flatReads.push(...flatten(whenClause.statements));
          }
        } else if (object instanceof OForLoop) {
          flatReads.push(...flatten(object.statements));
        } else {
          throw new Error('UUPS');
        }


      }
      return flatReads;
    };
    this.flatReads = flatten(this.statements);
    return this.flatReads;
  }
  private resets: string[] | null = null;
  getResets(): string[] {
    if (this.resets !== null) {
      return this.resets;
    }
    this.resets = [];
    if (!this.isRegisterProcess()) {
      return this.resets;
    }
    for (const statement of this.statements) {
      if (statement instanceof OIf) {
        for (const clause of statement.clauses) {
          if (clause.condition.match(/res/i)) {
            for (const subStatement of clause.statements) {
              if (subStatement instanceof OAssignment) {
                this.resets = this.resets.concat(subStatement.writes.map(write => write.text));
              }
            }
          }
        }
      }
    }
    return this.resets;
  }
}
export class OProcedureInstantiation extends ObjectBase {
  name: string;
  tokens: OToken[];
}
export class OForLoop extends ObjectBase {
  variable: string; // TODO: FIX ME not string
  start: string;
  end: string;
  statements: OStatement[] = [];
}
export class OAssignment extends ObjectBase {
  writes: OWrite[] = [];
  reads: ORead[] = [];
}
export class OToken extends ObjectBase {
  text: string;
}
export class OWrite extends OToken {
}
export class ORead extends OToken {

}
// Read of Record element or something
export class OElementRead extends ORead {

}
export class OMappingName extends OToken {
  parent: OMapping;
}
export class ParserError extends Error {
  constructor(message: string, public range: OIRange, public solution?: {message: string, edits: TextEdit[]}) {
    super(message);
  }
}
