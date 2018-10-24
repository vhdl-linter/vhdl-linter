export class ObjectBase {
  public startI: number;
  constructor (public parent: any, startI: number) {
    if (startI) {
      this.startI = startI;
    }
  }
  y() {

  }
}
export class OFile {
  libraries: string[] = [];
  useStatements: string[] = [];
  entity: OEntity;
  architecture: OArchitecture;
}
export class OArchitecture extends ObjectBase {
  signals: OSignal[] = [];
  processes: OProcess[] = [];
  instantiations: OInstantiation[] = [];
  generates: OGenerate[] = [];
  assignments: OAssignment[] = [];
  types: OType[] = [];
}
export class OType extends ObjectBase {
  name: string;
  states: string[] = [];
}
export class OGenerate extends OArchitecture {
  variable: string;
  start: string;
  end: string;
}
export class OValue extends ObjectBase {
  name: string;
  type: string;
  defaultValue?: string;
  constant: boolean;
}
export class OVariable extends OValue {

}
export class OSignal extends OValue {
    name: string;
    type: string;
    defaultValue?: string;
    constant: boolean;
    private register: boolean | null = null;
    private registerProcess: OProcess | null;
    constructor(public parent: OArchitecture, startI: number) {
      super(parent, startI);
    }
    isRegister(): boolean {
      if (this.register !== null) {
        return this.register;
      }
      this.register = false;
      for (const process of this.parent.processes) {
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
export class OInstantiation extends ObjectBase {
  label?: string;
  componentName: string;
  portMappings: OMapping[];
  genericMappings: OMapping[];
}
export class OMapping extends ObjectBase {
  name: string;
  mapping: string;
}
export class OEntity extends ObjectBase {
  name: string;
  ports: OPort[] = [];
  generics: OGeneric[] = [];
}
export class OPort extends ObjectBase {
    name: string;
    direction: 'in' | 'out' | 'inout';
    type: string;
    defaultValue?: string;
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
  variable: ORead;
  whenClauses: OWhenClause[] = [];
}
export class OWhenClause extends ObjectBase {
  condition: ORead;
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
          flatReads.push(object.variable);
          for (const whenClause of object.whenClauses) {
            flatReads.push(whenClause.condition);
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
          if (clause.condition.match(/reset/i)) {
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
  variable: string;
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
