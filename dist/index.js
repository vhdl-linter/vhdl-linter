"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser/parser");
const objects_1 = require("./parser/objects");
const project_parser_1 = require("./project-parser");
function activate() {
    // Fill something here, optional
}
exports.activate = activate;
function deactivate() {
    // Fill something here, optional
}
exports.deactivate = deactivate;
const projectParser = new project_parser_1.ProjectParser();
class VhdlLinter {
    constructor(editorPath, text) {
        this.editorPath = editorPath;
        this.text = text;
        this.messages = [];
        this.packageThings = [];
        projectParser.removeFile(editorPath);
        this.parser = new parser_1.Parser(this.text, this.editorPath);
        console.log(`parsing: ${editorPath}`);
        try {
            this.tree = this.parser.parse();
        }
        catch (e) {
            try {
                let positionStart = this.getPositionFromI(e.i);
                let positionEnd = [positionStart[0], Infinity];
                let position = [positionStart, positionEnd];
                this.messages.push({
                    location: {
                        file: this.editorPath,
                        position
                    },
                    severity: 'error',
                    excerpt: e.message
                });
            }
            catch (err) {
                console.error('error parsing error', e, err);
            }
        }
        console.log(`done parsing: ${editorPath}`);
    }
    parsePackages() {
        return __awaiter(this, void 0, void 0, function* () {
            const packages = yield projectParser.getPackages();
            for (const useStatement of this.tree.useStatements) {
                let match = useStatement.text.match(/([^.]+)\.([^.]+)\.all/i);
                let found = false;
                if (match) {
                    const library = match[1];
                    const pkg = match[2];
                    if (library.toLowerCase() === 'ieee') {
                        found = true;
                    }
                    else {
                        for (const foundPkg of packages) {
                            if (foundPkg.name.toLowerCase() === pkg.toLowerCase()) {
                                this.packageThings.push(...foundPkg.things);
                                found = true;
                            }
                        }
                    }
                }
                if (!found) {
                    this.messages.push({
                        location: {
                            file: this.editorPath,
                            position: this.getPositionFromILine(useStatement.begin, useStatement.end)
                        },
                        severity: 'warning',
                        excerpt: `could not find package for ${useStatement.text}`
                    });
                }
            }
        });
    }
    checkAll() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.tree) {
                if (atom) {
                    yield this.parsePackages();
                }
                this.checkResets();
                this.checkUnused(this.tree.architecture);
                this.checkDoubles();
                this.checkUndefineds();
                // this.parser.debugObject(this.tree);
            }
            return this.messages;
        });
    }
    checkDoubles() {
        if (!this.tree.architecture) {
            return;
        }
        for (const signal of this.tree.architecture.signals) {
            if (this.tree.architecture.signals.find(signalSearch => signal !== signalSearch && signal.name.toLowerCase() === signalSearch.name.toLowerCase())) {
                this.messages.push({
                    location: {
                        file: this.editorPath,
                        position: this.getPositionFromILine(signal.startI)
                    },
                    severity: 'error',
                    excerpt: `signal ${signal.name} defined multiple times`
                });
            }
        }
        for (const type of this.tree.architecture.types) {
            if (this.tree.architecture.types.find(typeSearch => type !== typeSearch && type.name.toLowerCase() === typeSearch.name.toLowerCase())) {
                this.messages.push({
                    location: {
                        file: this.editorPath,
                        position: this.getPositionFromILine(type.startI)
                    },
                    severity: 'error',
                    excerpt: `type ${type.name} defined multiple times`
                });
            }
            for (const state of type.states) {
                if (type.states.find(stateSearch => state !== stateSearch && state.name.toLowerCase() === stateSearch.name.toLowerCase())) {
                    this.messages.push({
                        location: {
                            file: this.editorPath,
                            position: this.getPositionFromILine(state.begin, state.end)
                        },
                        severity: 'error',
                        excerpt: `state ${state.name} defined multiple times`
                    });
                }
            }
        }
        for (const port of this.tree.entity.ports) {
            if (this.tree.entity.ports.find(portSearch => port !== portSearch && port.name.toLowerCase() === portSearch.name.toLowerCase())) {
                this.messages.push({
                    location: {
                        file: this.editorPath,
                        position: this.getPositionFromILine(port.startI)
                    },
                    severity: 'error',
                    excerpt: `port ${port.name} defined multiple times`
                });
            }
        }
    }
    checkUndefineds() {
        if (!this.tree.architecture) {
            return;
        }
        const ignores = ['unsigned', 'std_logic_vector', 'to_unsigned', 'to_integer', 'resize', 'rising_edge', 'to_signed', 'signed', 'shift_right', 'shift_left'];
        for (const process of this.tree.architecture.processes) {
            for (const write of process.getFlatWrites()) {
                let found = false;
                for (const signal of this.tree.architecture.signals) {
                    if (signal.name.toLowerCase() === write.text.toLowerCase()) {
                        found = true;
                    }
                }
                for (const variable of process.variables) {
                    if (variable.name.toLowerCase() === write.text.toLowerCase()) {
                        found = true;
                    }
                }
                for (const port of this.tree.entity.ports) {
                    if (port.direction === 'out' || port.direction === 'inout') {
                        if (port.name.toLowerCase() === write.text.toLowerCase()) {
                            found = true;
                        }
                    }
                }
                if (!found) {
                    let positionStart = this.getPositionFromI(write.begin);
                    let positionEnd = this.getPositionFromI(write.end);
                    let position = [positionStart, positionEnd];
                    this.messages.push({
                        location: {
                            file: this.editorPath,
                            position
                        },
                        severity: 'error',
                        excerpt: `signal '${write.text}' is written but not declared`
                    });
                }
            }
            for (const read of process.getFlatReads()) {
                let found = false;
                if (ignores.indexOf(read.text.toLowerCase()) > -1) {
                    found = true;
                }
                if (this.packageThings.find(packageConstant => packageConstant.toLowerCase() === read.text.toLowerCase())) {
                    found = true;
                }
                for (const type of this.tree.architecture.types) {
                    if (type.states.find(state => state.name.toLowerCase() === read.text.toLowerCase())) {
                        found = true;
                    }
                }
                for (const signal of this.tree.architecture.signals) {
                    if (signal.name.toLowerCase() === read.text.toLowerCase()) {
                        found = true;
                    }
                }
                for (const variable of process.variables) {
                    if (variable.name.toLowerCase() === read.text.toLowerCase()) {
                        found = true;
                    }
                }
                for (const port of this.tree.entity.ports) {
                    if (port.name.toLowerCase() === read.text.toLowerCase()) {
                        found = true;
                    }
                }
                for (const generic of this.tree.entity.generics) {
                    if (generic.name.toLowerCase() === read.text.toLowerCase()) {
                        found = true;
                    }
                }
                let parent = read.parent;
                while ((parent instanceof objects_1.OFile) === false) {
                    if (parent.variables) {
                        for (const variable of parent.variables) {
                            if (variable.name.toLowerCase() === read.text) {
                                found = true;
                            }
                        }
                    }
                    else if (parent instanceof objects_1.OForLoop) {
                        if (parent.variable.toLowerCase() === read.text) {
                            found = true;
                        }
                    }
                    parent = parent.parent;
                }
                if (!found) {
                    let positionStart = this.getPositionFromI(read.begin);
                    let positionEnd = this.getPositionFromI(read.end);
                    let position = [positionStart, positionEnd];
                    this.messages.push({
                        location: {
                            file: this.editorPath,
                            position
                        },
                        severity: 'error',
                        excerpt: `signal '${read.text}' is read but not declared`
                    });
                }
            }
        }
    }
    checkResets() {
        if (!this.tree.architecture) {
            return;
        }
        let signalLike = this.tree.architecture.signals;
        signalLike = signalLike.concat(this.tree.entity.ports);
        for (const signal of signalLike) {
            if (signal.isRegister() === false) {
                continue;
            }
            let resetFound = false;
            for (const process of this.tree.architecture.processes) {
                if (process.isRegisterProcess()) {
                    for (const reset of process.getResets()) {
                        if (reset.toLowerCase() === signal.name.toLowerCase()) {
                            resetFound = true;
                        }
                    }
                }
            }
            const registerProcess = signal.getRegisterProcess();
            if (!resetFound && registerProcess) {
                const solutions = [];
                for (const statement of registerProcess.statements) {
                    if (statement instanceof objects_1.OIf) {
                        for (const clause of statement.clauses) {
                            if (clause.condition.match(/reset/i)) {
                                let resetValue = null;
                                console.log(signal);
                                if (signal.type.match(/^std_logic_vector|unsigned|signed/i)) {
                                    resetValue = `(others => '0')`;
                                }
                                else if (signal.type.match(/^std_logic/i)) {
                                    resetValue = `'0'`;
                                }
                                else if (signal.type.match(/^integer/i)) {
                                    resetValue = `0`;
                                }
                                if (resetValue !== null) {
                                    let positionStart = this.getPositionFromI(clause.startI);
                                    positionStart[0]++;
                                    solutions.push({
                                        title: 'Add Register',
                                        position: [positionStart, positionStart],
                                        replaceWith: `  ${signal.name} <= ${resetValue};\n`
                                    });
                                }
                            }
                        }
                    }
                }
                this.messages.push({
                    location: {
                        file: this.editorPath,
                        position: this.getPositionFromILine(registerProcess.startI)
                    },
                    solutions,
                    severity: 'error',
                    excerpt: `Reset '${signal.name}' missing`
                });
            }
        }
    }
    // Array<{
    //     title?: string,
    //     position: Range,
    //     priority?: number,
    //     currentText?: string,
    //     replaceWith: string,
    //   }
    checkUnusedPerArchitecture(architecture, signal) {
        let unread = true;
        let unwritten = true;
        const sigLowName = signal.name.toLowerCase();
        for (const process of architecture.processes) {
            if (process.getFlatReads().find(read => read.text.toLowerCase() === sigLowName)) {
                unread = false;
            }
            if (process.getFlatWrites().find(write => write.text.toLowerCase() === sigLowName)) {
                unwritten = false;
            }
        }
        for (const assignment of architecture.assignments) {
            if (assignment.reads.find(read => read.text.toLowerCase() === sigLowName)) {
                unread = false;
            }
            if (assignment.writes.find(write => write.text.toLowerCase() === sigLowName)) {
                unwritten = false;
            }
        }
        for (const instantiation of architecture.instantiations) {
            if (instantiation.portMappings.find(portMap => portMap.mapping.toLowerCase() === sigLowName)) {
                unwritten = false;
                unread = false;
            }
        }
        for (const generate of architecture.generates) {
            const [unreadChild, unwrittenChild] = this.checkUnusedPerArchitecture(generate, signal);
            if (unreadChild) {
                unread = false;
            }
            if (unwrittenChild) {
                unwritten = false;
            }
        }
        return [unread, unwritten];
    }
    checkUnused(architecture) {
        if (!architecture) {
            return;
        }
        for (const signal of architecture.signals) {
            const [unread, unwritten] = this.checkUnusedPerArchitecture(architecture, signal);
            if (unread) {
                this.messages.push({
                    location: {
                        file: this.editorPath,
                        position: this.getPositionFromILine(signal.startI)
                    },
                    severity: 'warning',
                    excerpt: `Not reading signal '${signal.name}'`
                });
            }
            if (unwritten && !signal.constant) {
                this.messages.push({
                    location: {
                        file: this.editorPath,
                        position: this.getPositionFromILine(signal.startI)
                    },
                    severity: 'warning',
                    excerpt: `Not writing signal '${signal.name}'`
                });
            }
        }
        for (const generate of architecture.generates) {
            this.checkUnused(generate);
        }
    }
    getPositionFromILine(i, j) {
        const positionStart = this.getPositionFromI(i);
        const positionEnd = j ? this.getPositionFromI(j) : [positionStart[0], Infinity];
        const position = [positionStart, positionEnd];
        return position;
    }
    getPositionFromI(i) {
        let row = 0;
        let col = 0;
        for (let count = 0; count < i; count++) {
            if (this.text[count] === '\n') {
                row++;
                col = 0;
            }
            else {
                col++;
            }
        }
        return [row, col];
    }
}
exports.VhdlLinter = VhdlLinter;
console.log('hi');
function provideLinter() {
    return {
        name: 'Boss-Linter',
        scope: 'file',
        lintsOnChange: true,
        grammarScopes: ['source.vhdl'],
        lint(textEditor) {
            return __awaiter(this, void 0, void 0, function* () {
                const vhdlLinter = new VhdlLinter(textEditor.getPath() || '', textEditor.getText());
                const messages = yield vhdlLinter.checkAll();
                return messages;
            });
        }
    };
}
exports.provideLinter = provideLinter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLDRDQUF5QztBQUN6Qyw4Q0FBMEc7QUFFMUcscURBQWlEO0FBRWpELFNBQWdCLFFBQVE7SUFDdEIsZ0NBQWdDO0FBQ2xDLENBQUM7QUFGRCw0QkFFQztBQUVELFNBQWdCLFVBQVU7SUFDeEIsZ0NBQWdDO0FBQ2xDLENBQUM7QUFGRCxnQ0FFQztBQUNELE1BQU0sYUFBYSxHQUFHLElBQUksOEJBQWEsRUFBRSxDQUFDO0FBQzFDLE1BQWEsVUFBVTtJQUtyQixZQUFvQixVQUFrQixFQUFVLElBQVk7UUFBeEMsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUFVLFNBQUksR0FBSixJQUFJLENBQVE7UUFKNUQsYUFBUSxHQUFjLEVBQUUsQ0FBQztRQUd6QixrQkFBYSxHQUFhLEVBQUUsQ0FBQztRQUUzQixhQUFhLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxlQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDckQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDdEMsSUFBSTtZQUNGLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUNqQztRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsSUFBSTtnQkFDRixJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLFdBQVcsR0FBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ2pFLElBQUksUUFBUSxHQUF5QyxDQUFDLGFBQWEsRUFBRSxX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
