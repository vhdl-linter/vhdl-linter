import { Parser } from './parser/parser';
import { OFile, OIf, OAssignment, OForLoop } from './parser/objects';
import { RangeCompatible, Point, TextEditor, PointCompatible } from 'atom';

export function activate() {
  // Fill something here, optional
}

export function deactivate() {
  // Fill something here, optional
}
export class VhdlLinter {
  messages: Message[] = [];
  tree: OFile;
  constructor(private editorPath: string, private text: string) {
    let parser = new Parser(this.text, this.editorPath);
    console.log(`parsing: ${editorPath}`);
    try {
      this.tree = parser.parse();
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
  checkAll() {
    if (this.tree) {
      this.checkResets();
      this.checkUnused();
      this.checkUndefineds();
    }
    return this.messages;
  }
  checkUndefineds() {
    const ignores = ['unsigned', 'std_logic_vector', 'to_unsigned', 'to_integer', 'rising_edge'];
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
        if (read.text.match(/^c_/)) {
          found = true;
        }
        for (const type of this.tree.architecture.types) {
          if (type.states.find(state => state.toLowerCase() === read.text.toLowerCase())) {
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
    for (const signal of this.tree.architecture.signals) {
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
        this.messages.push({
          location: {
            file: this.editorPath,
            position: this.getPositionFromILine(registerProcess.startI)
          },
          severity: 'error',
          excerpt: `Reset '${signal.name}' missing`
        });
      }
    }
  }
  checkUnused() {
    for (const signal of this.tree.architecture.signals) {
      let unread = true;
      let unwritten = true;
      const sigLowName = signal.name.toLowerCase();
      for (const process of this.tree.architecture.processes) {
        if (process.getFlatReads().find(read => read.text.toLowerCase() === sigLowName)) {
          unread = false;
        }
        if (process.getFlatWrites().find(write => write.text.toLowerCase() === sigLowName)) {
          unwritten = false;
        }
      }
      for (const assignment of this.tree.architecture.assignments) {
        if (assignment.reads.find(read => read.text.toLowerCase() === sigLowName)) {
          unread = false;
        }
        if (assignment.writes.find(write => write.text.toLowerCase() === sigLowName)) {
          unwritten = false;
        }
      }
      for (const instantiation of this.tree.architecture.instantiations) {
        if (instantiation.portMappings.find(portMap => portMap.mapping.toLowerCase() === sigLowName)) {
          unwritten = false;
          unread = false;
        }
      }
      if (unread) {
        this.messages.push({
          location: {
            file: this.editorPath,
            position : this.getPositionFromILine(signal.startI)
          },
          severity: 'warning',
          excerpt: `Not reading signal '${signal.name}'`
        });
      }
      if (unwritten && !signal.constant) {
        this.messages.push({
          location: {
            file: this.editorPath,
            position : this.getPositionFromILine(signal.startI)
          },
          severity: 'warning',
          excerpt: `Not writing signal '${signal.name}'`
        });
      }
    }
  }





  getPositionFromILine(i: number): [[number, number], [number, number]] {
    const positionStart = this.getPositionFromI(i);
    const positionEnd: PointCompatible = [positionStart[0], Infinity];
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

export function provideLinter() {
  return {
    name: 'Boss-Linter',
    scope: 'file', // or 'project'
    lintsOnChange: true, // or true
    grammarScopes: ['source.vhdl'],
    lint(textEditor: TextEditor) {
      const vhdlLinter = new VhdlLinter(textEditor.getPath() || '', textEditor.getText());
      const messages = vhdlLinter.checkAll();
      return messages;
    }
  };
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
  solutions?: Array<{
    title?: string,
    position: Range,
    priority?: number,
    currentText?: string,
    replaceWith: string,
  } | {
    title?: string,
    priority?: number,
    position: Range,
    apply: (() => any),
  }>,
  description?: string | (() => Promise<string> | string)
};
