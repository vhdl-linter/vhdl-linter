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
const atom_1 = require("atom");
const project_parser_1 = require("./project-parser");
function activate() {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new atom_1.CompositeDisposable();
    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
        'vhdl-linter:copy-parsed': () => {
            const editor = atom.workspace.getActiveTextEditor();
            if (editor) {
                this.parser = new parser_1.Parser(editor.getText(), editor.getPath() || '');
                const tree = this.parser.parse();
                let target = {};
                const filter = (object) => {
                    const target = {};
                    if (!object) {
                        return;
                    }
                    for (const key of Object.keys(object)) {
                        if (key === 'parent') {
                            continue;
                        }
                        else if (Array.isArray(object[key])) {
                            target[key] = object[key].map(filter);
                        }
                        else if (typeof object[key] === 'object') {
                            target[key] = filter(object[key]);
                        }
                        else {
                            target[key] = object[key];
                        }
                    }
                    return target;
                };
                target = filter(tree);
                atom.clipboard.write(JSON.stringify(target));
            }
        }
    }));
}
exports.activate = activate;
function deactivate() {
    this.subscriptions.dispose();
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
            if (instantiation.portMappings.find(portMap => portMap.mapping.toLowerCase().replace(/\(.*\)*/, '') === sigLowName)) {
                unwritten = false;
                unread = false;
            }
        }
        for (const generate of architecture.generates) {
            const [unreadChild, unwrittenChild] = this.checkUnusedPerArchitecture(generate, signal);
            if (!unreadChild) {
                unread = false;
            }
            if (!unwrittenChild) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLDRDQUF5QztBQUN6Qyw4Q0FBMEc7QUFDMUcsK0JBQWlIO0FBQ2pILHFEQUFpRDtBQUVqRCxTQUFnQixRQUFRO0lBQ3RCLDRGQUE0RjtJQUM1RixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksMEJBQW1CLEVBQUUsQ0FBQztJQUUvQywwQ0FBMEM7SUFDMUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUU7UUFDekQseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1lBQzlCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUNwRCxJQUFJLE1BQU0sRUFBRTtnQkFDVixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksZUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRSxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQ25FLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2pDLElBQUksTUFBTSxHQUFRLEVBQUUsQ0FBQztnQkFDckIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxNQUFXLEVBQUUsRUFBRTtvQkFDN0IsTUFBTSxNQUFNLEdBQVEsRUFBRSxDQUFDO29CQUN2QixJQUFJLENBQUMsTUFBTSxFQUFFO3dCQUNYLE9BQU87cUJBQ1I7b0JBQ0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO3dCQUNyQyxJQUFJLEdBQUcsS0FBSyxRQUFRLEVBQUU7NEJBQ3BCLFNBQVM7eUJBQ1Y7NkJBQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFOzRCQUNyQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQzt5QkFFdkM7NkJBQU0sSUFBSSxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxRQUFRLEVBQUU7NEJBQzFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7eUJBQ25DOzZCQUFNOzRCQUNMLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7eUJBQzNCO3FCQUNGO29CQUNELE9BQU8sTUFBTSxDQUFDO2dCQUNoQixDQUFDLENBQUM7Z0JBQ0YsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2FBQzlDO1FBQ0gsQ0FBQztLQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQztBQXBDRCw0QkFvQ0M7QUFFRCxTQUFnQixVQUFVO0lBQ3hCLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDL0IsQ0FBQztBQUZELGdDQUVDO0FBR0QsTUFBTSxhQUFhLEdBQUcsSUFBSSw4QkFBYSxFQUFFLENBQUM7QUFDMUMsTUFBYSxVQUFVO0lBS3JCLFlBQW9CLFVBQWtCLEVBQVUsSUFBWTtRQUF4QyxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQVUsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUo1RCxhQUFRLEdBQWMsRUFBRSxDQUFDO1FBR3pCLGtCQUFhLEdBQWEsRUFBRSxDQUFDO1FBRTNCLGFBQWEsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLGVBQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyRCxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksVUFBVSxFQUFFLENBQUMsQ0FBQztRQUN0QyxJQUFJO1lBQ0YsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ2pDO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixJQUFJO2dCQUNGLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLElBQUksV0FBVyxHQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDakUsSUFBSSxRQUFRLEdBQXlDLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUNsRixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztvQkFDakIsUUFBUSxFQUFFO3dCQUNSLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVTt3QkFDckIsUUFBUTtxQkFDVDtvQkFDRCxRQUFRLEVBQUUsT0FBTztvQkFDakIsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPO2lCQUNuQixDQUFDLENBQUM7YUFDSjtZQUFDLE9BQU8sR0FBRyxFQUFFO2dCQUNaLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQzlDO1NBQ0Y7UUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBRTdDLENBQUM7SUFDSyxhQUFhOztZQUNqQixNQUFNLFFBQVEsR0FBRyxNQUFNLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNuRCxLQUFLLE1BQU0sWUFBWSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFO2dCQUNsRCxJQUFJLEtBQUssR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7Z0JBQ2xCLElBQUksS0FBSyxFQUFFO29CQUNULE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDekIsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNyQixJQUFJLE9BQU8sQ0FBQyxXQUFXLEVBQUUsS0FBSyxNQUFNLEVBQUU7d0JBQ3BDLEtBQUssR0FBRyxJQUFJLENBQUM7cUJBQ2Q7eUJBQU07d0JBQ0wsS0FBSyxNQUFNLFFBQVEsSUFBSSxRQUFRLEVBQUU7NEJBQy9CLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxHQUFHLENBQUMsV0FBVyxFQUFFLEVBQUU7Z0NBQ3JELElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dDQUM3QyxLQUFLLEdBQUcsSUFBSSxDQUFDOzZCQUNkO3lCQUNGO3FCQUNGO2lCQUNGO2dCQUNELElBQUksQ0FBQyxLQUFLLEVBQUU7b0JBQ1YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7d0JBQ2pCLFFBQVEsRUFBRTs0QkFDUixJQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVU7NEJBQ3JCLFFBQVEsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsR0FBRyxDQUFDO3lCQUMxRTt3QkFDRCxRQUFRLEVBQUUsU0FBUzt3QkFDbkIsT0FBTyxFQUFFLDhCQUE4QixZQUFZLENBQUMsSUFBSSxFQUFFO3FCQUMzRCxDQUFDLENBQUM7aUJBQ0o7YUFDRjtRQUNILENBQUM7S0FBQTtJQUNLLFFBQVE7O1lBQ1osSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO2dCQUNiLElBQUksSUFBSSxFQUFFO29CQUNSLE1BQU0sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2lCQUM1QjtnQkFDRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDekMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3ZCLHNDQUFzQzthQUN2QztZQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUN2QixDQUFDO0tBQUE7SUFDRCxZQUFZO1FBQ1YsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQzNCLE9BQU87U0FDUjtRQUNELEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFO1lBQ25ELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLE1BQU0sS0FBSyxZQUFZLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUU7Z0JBQ2pKLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO29CQUNqQixRQUFRLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVO3dCQUNyQixRQUFRLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7cUJBQ25EO29CQUNELFFBQVEsRUFBRSxPQUFPO29CQUNqQixPQUFPLEVBQUUsVUFBVSxNQUFNLENBQUMsSUFBSSx5QkFBeUI7aUJBQ3hELENBQUMsQ0FBQzthQUNKO1NBQ0Y7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRTtZQUMvQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssVUFBVSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFO2dCQUNySSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztvQkFDakIsUUFBUSxFQUFFO3dCQUNSLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVTt3QkFDckIsUUFBUSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO3FCQUNqRDtvQkFDRCxRQUFRLEVBQUUsT0FBTztvQkFDakIsT0FBTyxFQUFFLFFBQVEsSUFBSSxDQUFDLElBQUkseUJBQXlCO2lCQUNwRCxDQUFDLENBQUM7YUFDSjtZQUNELEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDL0IsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLEtBQUssS0FBSyxXQUFXLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUU7b0JBQ3pILElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO3dCQUNqQixRQUFRLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVOzRCQUNyQixRQUFRLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQzt5QkFDNUQ7d0JBQ0QsUUFBUSxFQUFFLE9BQU87d0JBQ2pCLE9BQU8sRUFBRSxTQUFTLEtBQUssQ0FBQyxJQUFJLHlCQUF5QjtxQkFDdEQsQ0FBQyxDQUFDO2lCQUVKO2FBQ0Y7U0FDRjtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFO1lBQ3pDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksS0FBTSxVQUFVLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUU7Z0JBQ2hJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO29CQUNqQixRQUFRLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVO3dCQUNyQixRQUFRLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7cUJBQ2pEO29CQUNELFFBQVEsRUFBRSxPQUFPO29CQUNqQixPQUFPLEVBQUUsUUFBUSxJQUFJLENBQUMsSUFBSSx5QkFBeUI7aUJBQ3BELENBQUMsQ0FBQzthQUVKO1NBQ0Y7SUFDSCxDQUFDO0lBQ0QsZUFBZTtRQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUMzQixPQUFPO1NBQ1I7UUFDRCxNQUFNLE9BQU8sR0FBRyxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDM0osS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUU7WUFDdEQsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUU7Z0JBQzNDLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztnQkFDbEIsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUU7b0JBQ25ELElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFO3dCQUMxRCxLQUFLLEdBQUcsSUFBSSxDQUFDO3FCQUNkO2lCQUNGO2dCQUNELEtBQUssTUFBTSxRQUFRLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRTtvQkFDeEMsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUU7d0JBQzVELEtBQUssR0FBRyxJQUFJLENBQUM7cUJBQ2Q7aUJBQ0Y7Z0JBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUU7b0JBQ3pDLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxLQUFLLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxPQUFPLEVBQUU7d0JBQzFELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFOzRCQUN4RCxLQUFLLEdBQUcsSUFBSSxDQUFDO3lCQUNkO3FCQUNGO2lCQUNGO2dCQUNELElBQUksQ0FBQyxLQUFLLEVBQUU7b0JBQ1YsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDdkQsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDbkQsSUFBSSxRQUFRLEdBQW9CLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO29CQUU3RCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQzt3QkFDakIsUUFBUSxFQUFFOzRCQUNSLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVTs0QkFDckIsUUFBUTt5QkFDVDt3QkFDRCxRQUFRLEVBQUUsT0FBTzt3QkFDakIsT0FBTyxFQUFFLFdBQVcsS0FBSyxDQUFDLElBQUksK0JBQStCO3FCQUM5RCxDQUFDLENBQUM7aUJBQ0o7YUFDRjtZQUNELEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxDQUFDLFlBQVksRUFBRSxFQUFFO2dCQUN6QyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7Z0JBQ2xCLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBRSxDQUFDLEVBQUU7b0JBQ2xELEtBQUssR0FBRyxJQUFJLENBQUM7aUJBQ2Q7Z0JBQ0QsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUU7b0JBQ3pHLEtBQUssR0FBRyxJQUFJLENBQUM7aUJBQ2Q7Z0JBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUU7b0JBQy9DLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRTt3QkFDbkYsS0FBSyxHQUFHLElBQUksQ0FBQztxQkFDZDtpQkFDRjtnQkFDRCxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRTtvQkFDbkQsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUU7d0JBQ3pELEtBQUssR0FBRyxJQUFJLENBQUM7cUJBQ2Q7aUJBQ0Y7Z0JBQ0QsS0FBSyxNQUFNLFFBQVEsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFO29CQUN4QyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRTt3QkFDM0QsS0FBSyxHQUFHLElBQUksQ0FBQztxQkFDZDtpQkFDRjtnQkFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRTtvQkFDekMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUU7d0JBQ3ZELEtBQUssR0FBRyxJQUFJLENBQUM7cUJBQ2Q7aUJBQ0Y7Z0JBQ0QsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUU7b0JBQy9DLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFO3dCQUMxRCxLQUFLLEdBQUcsSUFBSSxDQUFDO3FCQUNkO2lCQUNGO2dCQUNELElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7Z0JBQ3pCLE9BQU8sQ0FBQyxNQUFNLFlBQVksZUFBSyxDQUFDLEtBQUssS0FBSyxFQUFFO29CQUMxQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUU7d0JBQ3BCLEtBQUssTUFBTSxRQUFRLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRTs0QkFDdkMsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUU7Z0NBQzdDLEtBQUssR0FBRyxJQUFJLENBQUM7NkJBQ2Q7eUJBQ0Y7cUJBQ0Y7eUJBQU0sSUFBSSxNQUFNLFlBQVksa0JBQVEsRUFBRTt3QkFDckMsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUU7NEJBQy9DLEtBQUssR0FBRyxJQUFJLENBQUM7eUJBQ2Q7cUJBQ0Y7b0JBQ0QsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7aUJBQ3hCO2dCQUNELElBQUksQ0FBQyxLQUFLLEVBQUU7b0JBQ1YsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDdEQsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDbEQsSUFBSSxRQUFRLEdBQW9CLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO29CQUU3RCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQzt3QkFDakIsUUFBUSxFQUFFOzRCQUNSLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVTs0QkFDckIsUUFBUTt5QkFDVDt3QkFDRCxRQUFRLEVBQUUsT0FBTzt3QkFDakIsT0FBTyxFQUFFLFdBQVcsSUFBSSxDQUFDLElBQUksNEJBQTRCO3FCQUMxRCxDQUFDLENBQUM7aUJBQ0o7YUFDRjtTQUNGO0lBQ0gsQ0FBQztJQUNELFdBQVc7UUFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDM0IsT0FBTztTQUNSO1FBQ0QsSUFBSSxVQUFVLEdBQWtCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQztRQUMvRCxVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2RCxLQUFLLE1BQU0sTUFBTSxJQUFJLFVBQVUsRUFBRTtZQUMvQixJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUUsS0FBSyxLQUFLLEVBQUU7Z0JBQ2pDLFNBQVM7YUFDVjtZQUNELElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztZQUN2QixLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRTtnQkFDdEQsSUFBSSxPQUFPLENBQUMsaUJBQWlCLEVBQUUsRUFBRTtvQkFDL0IsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUU7d0JBQ3ZDLElBQUksS0FBSyxDQUFDLFdBQVcsRUFBRSxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUU7NEJBQ3JELFVBQVUsR0FBRyxJQUFJLENBQUM7eUJBQ25CO3FCQUNGO2lCQUNGO2FBQ0Y7WUFDRCxNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUNwRCxJQUFJLENBQUMsVUFBVSxJQUFJLGVBQWUsRUFBRTtnQkFDbEMsTUFBTSxTQUFTLEdBQWUsRUFBRSxDQUFDO2dCQUNqQyxLQUFLLE1BQU0sU0FBUyxJQUFJLGVBQWUsQ0FBQyxVQUFVLEVBQUU7b0JBQ2xELElBQUksU0FBUyxZQUFZLGFBQUcsRUFBRTt3QkFDNUIsS0FBSyxNQUFNLE1BQU0sSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFOzRCQUN0QyxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dDQUNwQyxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUM7Z0NBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0NBQ3BCLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsb0NBQW9DLENBQUMsRUFBRTtvQ0FDM0QsVUFBVSxHQUFHLGlCQUFpQixDQUFDO2lDQUNoQztxQ0FBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxFQUFFO29DQUMzQyxVQUFVLEdBQUcsS0FBSyxDQUFDO2lDQUNwQjtxQ0FBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFO29DQUN6QyxVQUFVLEdBQUcsR0FBRyxDQUFDO2lDQUNsQjtnQ0FDRCxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUU7b0NBQ3ZCLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7b0NBQ3pELGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29DQUNuQixTQUFTLENBQUMsSUFBSSxDQUFDO3dDQUNiLEtBQUssRUFBRSxjQUFjO3dDQUNyQixRQUFRLEVBQUUsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDO3dDQUN4QyxXQUFXLEVBQUUsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLFVBQVUsS0FBSztxQ0FDcEQsQ0FBQyxDQUFDO2lDQUNKOzZCQUNGO3lCQUNGO3FCQUNGO2lCQUNGO2dCQUNELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO29CQUNqQixRQUFRLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVO3dCQUNyQixRQUFRLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUM7cUJBQzVEO29CQUNELFNBQVM7b0JBQ1QsUUFBUSxFQUFFLE9BQU87b0JBQ2pCLE9BQU8sRUFBRSxVQUFVLE1BQU0sQ0FBQyxJQUFJLFdBQVc7aUJBQzFDLENBQUMsQ0FBQzthQUNKO1NBQ0Y7SUFDSCxDQUFDO0lBQ0QsVUFBVTtJQUNWLHNCQUFzQjtJQUN0Qix1QkFBdUI7SUFDdkIseUJBQXlCO0lBQ3pCLDRCQUE0QjtJQUM1QiwyQkFBMkI7SUFDM0IsTUFBTTtJQUNOLDBCQUEwQixDQUFDLFlBQTJCLEVBQUUsTUFBZTtRQUNyRSxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDN0MsS0FBSyxNQUFNLE9BQU8sSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFO1lBQzVDLElBQUksT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssVUFBVSxDQUFDLEVBQUU7Z0JBQy9FLE1BQU0sR0FBRyxLQUFLLENBQUM7YUFDaEI7WUFDRCxJQUFJLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLFVBQVUsQ0FBQyxFQUFFO2dCQUNsRixTQUFTLEdBQUcsS0FBSyxDQUFDO2FBQ25CO1NBQ0Y7UUFDRCxLQUFLLE1BQU0sVUFBVSxJQUFJLFlBQVksQ0FBQyxXQUFXLEVBQUU7WUFDakQsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssVUFBVSxDQUFDLEVBQUU7Z0JBQ3pFLE1BQU0sR0FBRyxLQUFLLENBQUM7YUFDaEI7WUFDRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxVQUFVLENBQUMsRUFBRTtnQkFDNUUsU0FBUyxHQUFHLEtBQUssQ0FBQzthQUNuQjtTQUNGO1FBQ0QsS0FBSyxNQUFNLGFBQWEsSUFBSSxZQUFZLENBQUMsY0FBYyxFQUFFO1lBQ3ZELElBQUksYUFBYSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLEtBQUssVUFBVSxDQUFDLEVBQUU7Z0JBQ25ILFNBQVMsR0FBRyxLQUFLLENBQUM7Z0JBQ2xCLE1BQU0sR0FBRyxLQUFLLENBQUM7YUFDaEI7U0FDRjtRQUNELEtBQUssTUFBTSxRQUFRLElBQUksWUFBWSxDQUFDLFNBQVMsRUFBRTtZQUM3QyxNQUFNLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDeEYsSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDaEIsTUFBTSxHQUFHLEtBQUssQ0FBQzthQUNoQjtZQUNELElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ25CLFNBQVMsR0FBRyxLQUFLLENBQUM7YUFDbkI7U0FDRjtRQUNELE9BQU8sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUNELFdBQVcsQ0FBQyxZQUEyQjtRQUNyQyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2pCLE9BQU87U0FDUjtRQUNELEtBQUssTUFBTSxNQUFNLElBQUksWUFBWSxDQUFDLE9BQU8sRUFBRTtZQUN6QyxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDbEYsSUFBSSxNQUFNLEVBQUU7Z0JBQ1YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7b0JBQ2pCLFFBQVEsRUFBRTt3QkFDUixJQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVU7d0JBQ3JCLFFBQVEsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztxQkFDbkQ7b0JBQ0QsUUFBUSxFQUFFLFNBQVM7b0JBQ25CLE9BQU8sRUFBRSx1QkFBdUIsTUFBTSxDQUFDLElBQUksR0FBRztpQkFDL0MsQ0FBQyxDQUFDO2FBQ0o7WUFDRCxJQUFJLFNBQVMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUU7Z0JBQ2pDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO29CQUNqQixRQUFRLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVO3dCQUNyQixRQUFRLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7cUJBQ25EO29CQUNELFFBQVEsRUFBRSxTQUFTO29CQUNuQixPQUFPLEVBQUUsdUJBQXVCLE1BQU0sQ0FBQyxJQUFJLEdBQUc7aUJBQy9DLENBQUMsQ0FBQzthQUNKO1NBQ0Y7UUFDRCxLQUFLLE1BQU0sUUFBUSxJQUFJLFlBQVksQ0FBQyxTQUFTLEVBQUU7WUFDN0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUM1QjtJQUNILENBQUM7SUFNRCxvQkFBb0IsQ0FBQyxDQUFTLEVBQUUsQ0FBVTtRQUN4QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0MsTUFBTSxXQUFXLEdBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNqRyxNQUFNLFFBQVEsR0FBb0IsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDL0QsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQUNELGdCQUFnQixDQUFDLENBQVM7UUFDeEIsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ1osSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ1osS0FBSyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUN0QyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUM3QixHQUFHLEVBQUUsQ0FBQztnQkFDTixHQUFHLEdBQUcsQ0FBQyxDQUFDO2FBQ1Q7aUJBQU07Z0JBQ0wsR0FBRyxFQUFFLENBQUM7YUFDUDtTQUNGO1FBQ0QsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNwQixDQUFDO0NBRUY7QUE1WUQsZ0NBNFlDO0FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsQixTQUFnQixhQUFhO0lBQzNCLE9BQU87UUFDTCxJQUFJLEVBQUUsYUFBYTtRQUNuQixLQUFLLEVBQUUsTUFBTTtRQUNiLGFBQWEsRUFBRSxJQUFJO1FBQ25CLGFBQWEsRUFBRSxDQUFDLGFBQWEsQ0FBQztRQUN4QixJQUFJLENBQUMsVUFBc0I7O2dCQUMvQixNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUNwRixNQUFNLFFBQVEsR0FBRyxNQUFNLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDN0MsT0FBTyxRQUFRLENBQUM7WUFDcEIsQ0FBQztTQUFBO0tBQ0EsQ0FBQztBQUNKLENBQUM7QUFaRCxzQ0FZQyJ9