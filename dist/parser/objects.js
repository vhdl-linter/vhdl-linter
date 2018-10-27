"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ObjectBase {
    constructor(parent, startI) {
        this.parent = parent;
        if (startI) {
            this.startI = startI;
        }
    }
    y() {
    }
}
exports.ObjectBase = ObjectBase;
class OFile {
    constructor() {
        this.libraries = [];
        this.useStatements = [];
    }
}
exports.OFile = OFile;
class OUseStatement extends ObjectBase {
}
exports.OUseStatement = OUseStatement;
class OArchitecture extends ObjectBase {
    constructor() {
        super(...arguments);
        this.signals = [];
        this.processes = [];
        this.instantiations = [];
        this.generates = [];
        this.assignments = [];
        this.types = [];
    }
}
exports.OArchitecture = OArchitecture;
class OType extends ObjectBase {
    constructor() {
        super(...arguments);
        this.states = [];
    }
}
exports.OType = OType;
class OState extends ObjectBase {
}
exports.OState = OState;
class OForGenerate extends OArchitecture {
}
exports.OForGenerate = OForGenerate;
class OIfGenerate extends OArchitecture {
}
exports.OIfGenerate = OIfGenerate;
class OVariable extends ObjectBase {
}
exports.OVariable = OVariable;
class OSignalLike extends ObjectBase {
    constructor(parent, startI) {
        super(parent, startI);
        this.parent = parent;
        this.register = null;
    }
    isRegister() {
        if (this.register !== null) {
            return this.register;
        }
        this.register = false;
        for (const process of this.parent.parent.architecture.processes) {
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
    getRegisterProcess() {
        if (this.isRegister === null) {
            return null;
        }
        return this.registerProcess;
    }
}
exports.OSignalLike = OSignalLike;
class OSignal extends OSignalLike {
}
exports.OSignal = OSignal;
class OInstantiation extends ObjectBase {
}
exports.OInstantiation = OInstantiation;
class OMapping extends ObjectBase {
}
exports.OMapping = OMapping;
class OEntity extends ObjectBase {
    constructor() {
        super(...arguments);
        this.ports = [];
        this.generics = [];
    }
}
exports.OEntity = OEntity;
class OPort extends OSignalLike {
}
exports.OPort = OPort;
class OGeneric extends ObjectBase {
}
exports.OGeneric = OGeneric;
class OIf extends ObjectBase {
    constructor() {
        super(...arguments);
        this.clauses = [];
        this.elseStatements = [];
    }
}
exports.OIf = OIf;
class OIfClause extends ObjectBase {
    constructor() {
        super(...arguments);
        this.statements = [];
    }
}
exports.OIfClause = OIfClause;
class OCase extends ObjectBase {
    constructor() {
        super(...arguments);
        this.whenClauses = [];
    }
}
exports.OCase = OCase;
class OWhenClause extends ObjectBase {
    constructor() {
        super(...arguments);
        this.statements = [];
    }
}
exports.OWhenClause = OWhenClause;
class OProcess extends ObjectBase {
    constructor() {
        super(...arguments);
        this.statements = [];
        this.variables = [];
        this.registerProcess = null;
        this.flatWrites = null;
        this.flatReads = null;
        this.resets = null;
    }
    isRegisterProcess() {
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
    getFlatWrites() {
        if (this.flatWrites !== null) {
            return this.flatWrites;
        }
        const flatten = (objects) => {
            const flatWrites = [];
            for (const object of objects) {
                if (object instanceof OAssignment) {
                    flatWrites.push(...object.writes);
                }
                else if (object instanceof OIf) {
                    flatWrites.push(...flatten(object.elseStatements));
                    for (const clause of object.clauses) {
                        flatWrites.push(...flatten(clause.statements));
                    }
                }
                else if (object instanceof OCase) {
                    for (const whenClause of object.whenClauses) {
                        flatWrites.push(...flatten(whenClause.statements));
                    }
                }
                else if (object instanceof OForLoop) {
                    flatWrites.push(...flatten(object.statements));
                }
                else {
                    throw new Error('UUPS');
                }
            }
            return flatWrites;
        };
        this.flatWrites = flatten(this.statements);
        return this.flatWrites;
    }
    getFlatReads() {
        if (this.flatReads !== null) {
            return this.flatReads;
        }
        const flatten = (objects) => {
            const flatReads = [];
            for (const object of objects) {
                if (object instanceof OAssignment) {
                    flatReads.push(...object.reads);
                }
                else if (object instanceof OIf) {
                    flatReads.push(...flatten(object.elseStatements));
                    for (const clause of object.clauses) {
                        flatReads.push(...clause.conditionReads);
                        flatReads.push(...flatten(clause.statements));
                    }
                }
                else if (object instanceof OCase) {
                    flatReads.push(...object.variable);
                    for (const whenClause of object.whenClauses) {
                        flatReads.push(...whenClause.condition);
                        flatReads.push(...flatten(whenClause.statements));
                    }
                }
                else if (object instanceof OForLoop) {
                    flatReads.push(...flatten(object.statements));
                }
                else {
                    throw new Error('UUPS');
                }
            }
            return flatReads;
        };
        this.flatReads = flatten(this.statements);
        return this.flatReads;
    }
    getResets() {
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
exports.OProcess = OProcess;
class OForLoop extends ObjectBase {
    constructor() {
        super(...arguments);
        this.statements = [];
    }
}
exports.OForLoop = OForLoop;
class OAssignment extends ObjectBase {
    constructor() {
        super(...arguments);
        this.writes = [];
        this.reads = [];
    }
}
exports.OAssignment = OAssignment;
class OWriteReadBase extends ObjectBase {
}
exports.OWriteReadBase = OWriteReadBase;
class OWrite extends OWriteReadBase {
}
exports.OWrite = OWrite;
class ORead extends OWriteReadBase {
}
exports.ORead = ORead;
class ParserError extends Error {
    constructor(message, i) {
        super(message);
        this.i = i;
    }
}
exports.ParserError = ParserError;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9wYXJzZXIvb2JqZWN0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLE1BQWEsVUFBVTtJQUVyQixZQUFvQixNQUFXLEVBQUUsTUFBYztRQUEzQixXQUFNLEdBQU4sTUFBTSxDQUFLO1FBQzdCLElBQUksTUFBTSxFQUFFO1lBQ1YsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7U0FDdEI7SUFDSCxDQUFDO0lBQ0QsQ0FBQztJQUVELENBQUM7Q0FDRjtBQVZELGdDQVVDO0FBQ0QsTUFBYSxLQUFLO0lBQWxCO1FBQ0UsY0FBUyxHQUFhLEVBQUUsQ0FBQztRQUN6QixrQkFBYSxHQUFvQixFQUFFLENBQUM7SUFHdEMsQ0FBQztDQUFBO0FBTEQsc0JBS0M7QUFDRCxNQUFhLGFBQWMsU0FBUSxVQUFVO0NBSTVDO0FBSkQsc0NBSUM7QUFDRCxNQUFhLGFBQWMsU0FBUSxVQUFVO0lBQTdDOztRQUNFLFlBQU8sR0FBYyxFQUFFLENBQUM7UUFDeEIsY0FBUyxHQUFlLEVBQUUsQ0FBQztRQUMzQixtQkFBYyxHQUFxQixFQUFFLENBQUM7UUFDdEMsY0FBUyxHQUFvQixFQUFFLENBQUM7UUFDaEMsZ0JBQVcsR0FBa0IsRUFBRSxDQUFDO1FBQ2hDLFVBQUssR0FBWSxFQUFFLENBQUM7SUFDdEIsQ0FBQztDQUFBO0FBUEQsc0NBT0M7QUFDRCxNQUFhLEtBQU0sU0FBUSxVQUFVO0lBQXJDOztRQUVFLFdBQU0sR0FBYSxFQUFFLENBQUM7SUFDeEIsQ0FBQztDQUFBO0FBSEQsc0JBR0M7QUFDRCxNQUFhLE1BQU8sU0FBUSxVQUFVO0NBSXJDO0FBSkQsd0JBSUM7QUFDRCxNQUFhLFlBQWEsU0FBUSxhQUFhO0NBSTlDO0FBSkQsb0NBSUM7QUFDRCxNQUFhLFdBQVksU0FBUSxhQUFhO0NBRzdDO0FBSEQsa0NBR0M7QUFDRCxNQUFhLFNBQVUsU0FBUSxVQUFVO0NBTXhDO0FBTkQs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