import { OFile, OIf, OForLoop, OSignalLike, OSignal, OArchitecture, OEntity, OPort } from './parser/objects';
import { RangeCompatible, Point, TextEditor, PointCompatible, CompositeDisposable } from 'atom';
import { Parser } from './parser/parser';
import { ProjectParser, OProjectEntity } from './project-parser';

export class VhdlLinter {
  messages: Message[] = [];
  tree: OFile;
  parser: Parser;
  packageThings: string[] = [];
  constructor(private editorPath: string, private text: string, public projectParser: ProjectParser) {
    console.log('lint');
    this.projectParser.removeFile(editorPath);
    this.parser = new Parser(this.text, this.editorPath);
    console.log(`parsing: ${editorPath}`);
    try {
      this.tree = this.parser.parse();
    } catch (e) {
      try {
        let positionStart = this.getPositionFromI(e.i);
        let positionEnd: [number, number] = [positionStart[0], Infinity];
        let position: [[number, number], [number, number]] = [positionStart, positionEnd];
        this.messages.push({
          location: {
            file: this.editorPath,
            position
          },
          severity: 'error',
          excerpt: e.message
        });
      } catch (err) {
        console.error('error parsing error', e, err);
      }
    }
    console.log(`done parsing: ${editorPath}`);

  }
  async parsePackages() {
    const packages = await this.projectParser.getPackages();
    for (const useStatement of this.tree.useStatements) {
      let match = useStatement.text.match(/([^.]+)\.([^.]+)\.all/i);
      let found = false;
      if (match) {
        const library = match[1];
        const pkg = match[2];
        if (library.toLowerCase() === 'ieee') {
          found = true;
        } else {
          for (const foundPkg of packages) {
            if (foundPkg.name.toLowerCase() === pkg.toLowerCase()) {
              this.packageThings.push(... foundPkg.things);
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
  }
  async checkAll() {
    if (this.tree) {
      if (atom) {
        await this.parsePackages();
      }
      this.checkResets();
      this.checkUnused(this.tree.architecture);
      this.checkDoubles();
      this.checkUndefineds();
      this.checkPortDeclaration();
      await this.checkInstantiations(this.tree.architecture);
      // this.parser.debugObject(this.tree);
    }
    return this.messages;
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
      if (this.tree.entity.ports.find(portSearch => port  !== portSearch && port.name.toLowerCase() === portSearch.name.toLowerCase())) {
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
          let position: RangeCompatible = [positionStart, positionEnd];

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
        if (ignores.indexOf(read.text.toLowerCase()) > - 1) {
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
        while ((parent instanceof OFile) === false) {
          if (parent.variables) {
            for (const variable of parent.variables) {
              if (variable.name.toLowerCase() === read.text) {
                found = true;
              }
            }
          } else if (parent instanceof OForLoop) {
            if (parent.variable.toLowerCase() === read.text) {
              found = true;
            }
          }
          parent = parent.parent;
        }
        if (!found) {
          let positionStart = this.getPositionFromI(read.begin);
          let positionEnd = this.getPositionFromI(read.end);
          let position: RangeCompatible = [positionStart, positionEnd];

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
    let signalLike: OSignalLike[] = this.tree.architecture.signals;
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
        let resetBlockFound = false;
        const solutions: Solution[] = [];
        for (const statement of registerProcess.statements) {
          if (statement instanceof OIf) {
            for (const clause of statement.clauses) {
              if (clause.condition.match(/reset/i)) {
                resetBlockFound = true;
                let resetValue = null;
                if (signal.type.match(/^std_u?logic_vector|unsigned|signed/i)) {
                  resetValue = `(others => '0')`;
                } else if (signal.type.match(/^std_u?logic/i)) {
                  resetValue = `'0'`;
                } else if (signal.type.match(/^integer/i)) {
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
        const excerpt = resetBlockFound ? `Reset '${signal.name}' missing` : `Reset '${signal.name}' missing. Reset Block not found!`;
        this.messages.push({
          location: {
            file: this.editorPath,
            position: this.getPositionFromILine(registerProcess.startI)
          },
          solutions,
          severity: 'error',
          excerpt
        });
      }
    }
  }

  checkUnusedPerArchitecture(architecture: OArchitecture, signal: OSignal|OPort) {
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
      if (instantiation.getFlatReads().find(read => read.text.toLowerCase() === sigLowName)) {

        unread = false;
      }
      if (instantiation.getFlatWrites().find(read => read.text.toLowerCase() === sigLowName)) {
        unwritten = false;
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
  checkUnused(architecture: OArchitecture, entity?: OEntity) {
    if (!architecture) {
      return;
    }
    for (const generate of architecture.generates) {
      this.checkUnused(generate);
    }
    if (entity) {
      for (const port of entity.ports) {
        const [unread, unwritten] = this.checkUnusedPerArchitecture(architecture, port);
        if (unread && port.direction === 'in') {
          this.messages.push({
            location: {
              file: this.editorPath,
              position: this.getPositionFromILine(port.startI)
            },
            severity: 'warning',
            excerpt: `Not reading input port '${port.name}'`
          });
        }
        if (unwritten && port.direction === 'out') {
          this.messages.push({
            location: {
              file: this.editorPath,
              position: this.getPositionFromILine(port.startI)
            },
            severity: 'warning',
            excerpt: `Not writing output port '${port.name}'`
          });
        }
      }
    }
  }
  checkPortDeclaration() {
    for (const port of this.tree.entity.ports) {
      if (port.direction === 'in') {
        if (port.name.match(/^o_/i)) {
          this.messages.push({
            location: {
              file: this.editorPath,
              position: this.getPositionFromILine(port.startI)
            },
            severity: 'error',
            excerpt: `input port '${port.name}' begins with 'o_'!`
          });
        } else if (port.name.match(/^i_/i) === null) {
          this.messages.push({
            location: {
              file: this.editorPath,
              position: this.getPositionFromILine(port.startI)
            },
            severity: 'warning',
            excerpt: `input port '${port.name}' should begin with i_`
          });
        }
      } else if (port.direction === 'out') {
        if (port.name.match(/^i_/i)) {
          this.messages.push({
            location: {
              file: this.editorPath,
              position: this.getPositionFromILine(port.startI)
            },
            severity: 'error',
            excerpt: `input port '${port.name}' begins with 'i_'!`
          });
        } else if (port.name.match(/^o_/i) === null) {
          this.messages.push({
            location: {
              file: this.editorPath,
              position: this.getPositionFromILine(port.startI)
            },
            severity: 'warning',
            excerpt: `input port '${port.name}' should begin with 'o_'`
          });
        }
      }
    }
  }
  async checkInstantiations(architecture: OArchitecture) {
    const projectEntities: OProjectEntity[] = await this.projectParser.getEntities();
    for (const instantiation of architecture.instantiations) {
      if (instantiation.entityInstantiation) {
        const entity = projectEntities.find(entity => entity.name.toLowerCase() === instantiation.componentName.toLowerCase());
        if (!entity) {
          this.messages.push({
            location: {
              file: this.editorPath,
              position: this.getPositionFromILine(instantiation.startI)
            },
            severity: 'error',
            excerpt: `can not find entity ${instantiation.componentName}`
          });
        } else {
          for (const portMapping of instantiation.portMappings) {
            if (!entity.ports.find(port => port.name.toLowerCase() === portMapping.name.toLowerCase())) {
              this.messages.push({
                location: {
                  file: this.editorPath,
                  position: this.getPositionFromILine(portMapping.startI)
                },
                severity: 'error',
                excerpt: `no port ${portMapping.name} on entity ${instantiation.componentName}`
              });
            }
          }
        }
      } else {
        this.messages.push({
          location: {
            file: this.editorPath,
            position: this.getPositionFromILine(instantiation.startI)
          },
          severity: 'warning',
          excerpt: `can not evaluate instantiation via component`
        });
      }
    }
  }




  getPositionFromILine(i: number, j?: number): [[number, number], [number, number]] {
    const positionStart = this.getPositionFromI(i);
    const positionEnd: PointCompatible = j ? this.getPositionFromI(j) : [positionStart[0], Infinity];
    const position: RangeCompatible = [positionStart, positionEnd];
    return position;
  }
  getPositionFromI(i: number): [number, number] {
    let row = 0;
    let col = 0;
    for (let count = 0; count < i; count++) {
      if (this.text[count] === '\n') {
        row++;
        col = 0;
      } else {
        col++;
      }
    }
    return [row, col];
  }

}
export type Message = {
  // From providers
  location: {
    file: string,
    position: [[number, number], [number, number]],
  },
  reference?: {
    file: string,
    position?: Point,
  },
  url?: string,
  icon?: string,
  excerpt: string,
  severity: 'error' | 'warning' | 'info',
  solutions?: Solution[],
  description?: string | (() => Promise<string> | string)
};
export type Solution = {
  title?: string,
  position: [[number, number], [number, number]],
  priority?: number,
  currentText?: string,
  replaceWith: string,
} | {
  title?: string,
  priority?: number,
  position: [[number, number], [number, number]],
  apply: (() => any),
};
