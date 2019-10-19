export class ObjectBase {
  public startI: number;
  public endI: number;
  constructor (public parent: ObjectBase|OFile, startI: number, endI: number) {
    if (startI) {
      this.startI = startI;
    }
    if (endI) {
      this.endI = endI;
    }
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
  y() {

  }
}
export class OFile {
  constructor(public text: string, public file: string, public originalText: string) {}
  libraries: string[] = [];
  useStatements: OUseStatement[] = [];
  objectList: ObjectBase[] = [];
  getJSONMagic() {
    let target: any = {};
    const filter = (object: any) => {
      const target: any = {};
      if (!object) {
        return;
      }
      if (typeof object === 'string') {
        return object;
      }
      for (const key of Object.keys(object)) {
        if (key === 'parent') {
          continue;
        } else if (Array.isArray(object[key])) {
          target[key] = object[key].map(filter);

        } else if (typeof object[key] === 'object') {
          target[key] = filter(object[key]);
        } else {
          target[key] = object[key];
        }
      }
      return target;
    };
    target = filter(this);
    return target;
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
}
export class OUseStatement extends ObjectBase {
  text: string;
  begin: number;
  end: number;
}
export class OFunction extends ObjectBase {
  name: string;
}
export class OArchitecture extends ObjectBase {
  signals: OSignal[] = [];
  processes: OProcess[] = [];
  instantiations: OInstantiation[] = [];
  generates: OArchitecture[] = [];
  assignments: OAssignment[] = [];
  types: OType[] = [];
  functions: OFunction[] = [];
  isValidWrite(write: OWrite): boolean {
    let found = false;
    let parent = write.parent;
    let counter = 100;
    while ((parent instanceof OFile) === false) {
      if (parent instanceof OArchitecture) {
        for (const signal of parent.signals) {
            found = found || signal.name.toLowerCase() === write.text.toLowerCase();
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
        found = found || signal.name.toLowerCase() === write.text.toLowerCase();
    }
    for (const port of file.entity.ports) {
      found = found || port.name.toLowerCase() === write.text.toLowerCase();
    }
    for (const type of file.architecture.types) {
      if (type instanceof OEnum && type.states.find(state => state.name.toLowerCase() === write.text.toLowerCase())) {
        found = true;
      }
    }
    return found;
  }
  isValidRead(read: ORead, packages: OPackage[]): boolean {
    return this.findRead(read, packages) !== false;
  }
  findRead(read: ORead, packages: OPackage[]): OSignal|OFunction|false|OForLoop|OForGenerate {
    let found: OSignal|OFunction|false|OForLoop|OForGenerate = false;

    for (const pkg of packages) {
      for (const constant of pkg.constants) {
        if (constant.name.toLowerCase() === read.text.toLowerCase()) {
          return constant;
        }
      }
      for (const func of pkg.functions) {
        if (func.name.toLowerCase() === read.text.toLowerCase()) {
          return func;
        }
      }
      for (const type of pkg.types) {
        if (type.name.toLowerCase() === read.text.toLowerCase()) {
          return type;
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
      // No Else if. Can be Instance of Multiple Classes (extends)
      if (parent instanceof OArchitecture) {
        for (const signal of parent.signals) {
          found = found || signal.name.toLowerCase() === read.text.toLowerCase() && signal;
        }
        for (const func of parent.functions) {
          found = found || func.name.toLowerCase() === read.text.toLowerCase() && func;
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
        found = found || generic.name.toLowerCase() === read.text.toLowerCase() && generic;
      }
      for (const port of file.entity.ports) {
        found = found || port.name.toLowerCase() === read.text.toLowerCase() && port;
      }
      for (const type of file.architecture.types) {
        if (type instanceof OEnum) {
          const state = type.states.find(state => state.name.toLowerCase() === read.text.toLowerCase());
          found = found || typeof state !== 'undefined' && state;
        }
      }
    }
    return found;
  }
}
export class OType extends ObjectBase {
  name: string;
}
export class OEnum extends OType {
  states: OState[] = [];
}
export class ORecord extends OType {
  children: OType[];
}
export class OState extends ObjectBase {
  begin: number;
  end: number;
  name: string;
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
export class OSignalLike extends ObjectBase {
  type: string;
  name: string;
  defaultValue?: string;
  private register: boolean | null = null;
  private registerProcess: OProcess | null;
  reads: ORead[];
  constructor(public parent: OArchitecture|OEntity|OPackage, startI: number, endI: number) {
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
          if (write.text.toLowerCase() === this.name.toLowerCase()) {
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
export class OInstantiation extends ObjectBase {
  label?: string;
  componentName: string;
  portMappings: OMapping[] = [];
  genericMappings: OMapping[] = [];
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
    for (const portMapping of this.portMappings) {
      if (entity) {
        const entityPort = entity.ports.find(port => {
          for (const part of portMapping.name) {
            if (part.text.toLowerCase() === port.name.toLowerCase()) {
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
    for (const portMapping of this.genericMappings) {
      this.flatReads.push(...portMapping.mappingIfInput);
    }
    return this.flatReads;
  }
  getFlatWrites(entity: OEntity | undefined): OWrite[] {
//     console.log(entity, 'asd');
    if (this.flatWrites !== null) {
      return this.flatWrites;
    }
    this.flatWrites = [];
    for (const portMapping of this.portMappings) {
      if (entity) {
        const entityPort = entity.ports.find(port => {
          for (const part of portMapping.name) {
            if (part.text.toLowerCase() === port.name.toLowerCase()) {
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
    return this.flatWrites;
  }
}
export class OMapping extends ObjectBase {
  constructor(public parent: OInstantiation, startI: number, endI: number) {
    super(parent, startI, endI);
  }
  name: ORead[];
  mappingIfInput: ORead[];
  mappingIfOutput: [ORead[], OWrite[]];
}
export class OEntity extends ObjectBase {
  constructor(public parent: OFileWithEntity, startI: number, endI: number, public library?: string) {
    super(parent, startI, endI);
  }
  name: string;
  ports: OPort[] = [];
  generics: OGeneric[] = [];
  signals: OSignal[] = [];
  functions: OFunction[] = [];
}
export class OPort extends OSignalLike {
    direction: 'in' | 'out' | 'inout';
    hasDefault: boolean;
}
export class OGeneric extends ObjectBase {
    name: string;
    type: string;
    defaultValue?: string;
}
export type OStatement = OCase | OAssignment | OIf | OForLoop;
export class OIf extends ObjectBase {
  clauses: OIfClause[] = [];
  elseStatements: OStatement[] = [];
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
  getStates(): OState[] {
    if (this.isRegisterProcess() === false) {
      return [];
    }
    let states: OState[] = [];
    for (const statement of this.statements) {
      if (statement instanceof OIf) {
        for (const clause of statement.clauses) {
          if (clause.condition.match(/rising_edge/i)) {
            for (const statement of clause.statements) {
              if (statement instanceof OCase) {
                for (const whenClause of statement.whenClauses) {
                  const state = new OState(whenClause.parent, whenClause.startI, whenClause.endI);
                  state.name = whenClause.condition.map(read => read.text).join(' ');
                  states.push(state);
                }
              }
            }
          }
        }
      }
    }
    return states;
  }
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
          flatWrites.push(... flatten(object.elseStatements));
          for (const clause of object.clauses) {
            flatWrites.push(... flatten(clause.statements));
          }
        } else if (object instanceof OCase) {
          for (const whenClause of object.whenClauses) {
            flatWrites.push(... flatten(whenClause.statements));
          }
        } else if (object instanceof OForLoop) {
          flatWrites.push(... flatten(object.statements));
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
          flatReads.push(... flatten(object.elseStatements));
          for (const clause of object.clauses) {
            flatReads.push(... clause.conditionReads);
            flatReads.push(... flatten(clause.statements));
          }
        } else if (object instanceof OCase) {
          flatReads.push(... object.variable);
          for (const whenClause of object.whenClauses) {
            flatReads.push(... whenClause.condition);
            flatReads.push(... flatten(whenClause.statements));
          }
        } else if (object instanceof OForLoop) {
          flatReads.push(... flatten(object.statements));
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
export class OForLoop extends ObjectBase {
  variable: string; // TODO: FIX ME not string
  start: string;
  end: string;
  statements: OStatement[] = [];
}
export class OAssignment extends ObjectBase {
  writes: OWrite[] = [];
  reads: ORead[] = [];
  begin: number;
  end: number;
}
export class OWriteReadBase extends ObjectBase {
  begin: number;
  end: number;
  text: string;
}
export class OWrite extends OWriteReadBase {
}
export class ORead extends OWriteReadBase {

}
export class ParserError extends Error {
    constructor(message: string, public i: number) {
      super(message);
    }
}
