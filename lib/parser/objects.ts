export class ObjectBase {
  public startI: number;
  constructor (startI?: number) {
    if (startI) {
      this.startI = startI;
    }
  }
  y() {

  }
}
export class OArchitecture extends ObjectBase {
  signals: OSignal[] = [];
  processes: OProcess[] = [];
  instantiations: OInstantiation[] = [];
  generates: OGenerate[] = [];
  statements: OAssignment[] = [];
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
export class OSignal extends ObjectBase {
    name: string;
    type: string;
    defaultValue?: string;
    constant: boolean;
}
export class OInstantiation extends ObjectBase {
  label?: string;
  componentName: string;
  portMappings: OMapping[]
  genericMappings: OMapping[]
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
  conditionReads: string[];
  statements: OStatement[] = [];
}
export class OCase extends ObjectBase {
  variable: string;
  whenClauses: OWhenClause[] = [];
}
export class OWhenClause extends ObjectBase {
  condition: string;
  statements: OStatement[] = [];
}
export class OProcess extends ObjectBase {
  statements: OStatement[] = [];
  sensitivityList: string;
  label?: string;
  variables: OSignal[] = [];
}
export class OForLoop extends ObjectBase {
  variable: string;
  start: string;
  end: string;
  statements: OStatement[] = [];
}
export class OAssignment extends ObjectBase {
  writes: string[] = [];
  reads: string[] = [];
}
