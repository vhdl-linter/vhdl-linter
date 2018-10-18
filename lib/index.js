'use babel'
import {
  Range,
  Point
} from 'atom'

// console.log('hi');
export function activate() {
  // console.log('hi');
  // Fill something here, optional
}

export function deactivate() {
  // Fill something here, optional
}

class VhdlLinter {
  processes = [];
  wires = [];
  messages = [];
  constructor(editor) {
    this.editorPath = editor.getPath();
    this.text = editor.getText();
    this.lines = this.text.split('\n').map(line => {
      return line.replace(/--.*/, '');
    });
    this.findWires();
    this.findProcesses();
    this.findWritesAndReads();
  }
  parseWrite(write) {
    write = write.trim();
    return write.match(/^[^.]*/)[0];
  }
  findWritesAndReads() {
    let mode = 'start';
    this.writes = [];
    this.reads = [];
    for (const [lineNumber, line] of this.lines.entries()) {
      if (mode == 'start') {
        if (line.match(/^\s*architecture/i) !== null) {
          mode = 'signal-definition';
        }
      } else if (mode == 'signal-definition') {
        if (line.match(/^\s*begin/i) !== null) {
          mode = 'architecture';
        }
      } else if (mode === 'architecture') {
        let match = line.match(/(.*)<=(.*)/i);
        if (match !== null) {
          this.writes.push({
            name: this.parseWrite(match[1]),
            lineNumber
          });
          this.reads.push({
            name: match[2].trim(),
            lineNumber
          });
          if (line.match(/;\s*$/i) !== null) {
            // mode = 'assignment';
          }
        }
      }
    }
    console.log(this.writes, this.reads);
  }
  checkUndefinedWrites() {
    const undefinedWrites = [];
    for(const write of this.writes) {
      const matchingWires = this.wires.filter(wire => {
        return wire.name === write.name && wire.type !== 'input';
      });
      if (matchingWires.length === 0) {
        undefinedWrites.push(write);
      }
    }
    for (const undefinedWrite of undefinedWrites) {
      this.messages.push({
        severity: 'error',
        location: {
          file: this.editorPath,
          position: new Range(new Point(undefinedWrite.lineNumber, 0), new Point(undefinedWrite.lineNumber, Infinity)),
        },
        excerpt: `${undefinedWrite.name} not defined!`,
        description: ``
      });
    }
  }
  findWires() {
    this.wires = [];
    for (const [lineNumber, line] of this.lines.entries()) {
      let re = /^\s*signal\s+(\S+)/;
      if (m = re.exec(line)) {
        this.wires.push({
          lineNumber,
          name: m[1],
          type: 'signal'
        });
      }
      re = /^\s*(\S+)\s*:\s*(out|in|inout)\s/i;
      if (m = re.exec(line)) {
        this.wires.push({
          lineNumber,
          name: m[1],
          type: m[2]
        });
      }
    }
  }
  findProcesses() {
    this.processes = [];
    let resets = [];
    let processMode = false;
    let regProcMode = false;
    let startIndex = -1;
    let risingEdge = -1;
    for (const [i, line] of this.lines.entries()) {
      let re = /^\s*(\S+\s*:\s*)?process/i;
      if (m = re.exec(line)) {
        processMode = true;
        regProcMode = false;
        startIndex = i;
        resets = [];
      } else if (processMode) {
        let re = /rising_edge/i;
        if (m = re.exec(line)) {
          regProcMode = true;
          risingEdge = i;
        }
        re = /^\s*(\S+)\s*<=.*/i;
        if (!regProcMode && (m = re.exec(line))) {
          resets.push(m[1]);
        }
        re = /^\s*end\s+process/i;
        if (m = re.exec(line)) {
          processMode = false;
          this.processes.push({
            startIndex,
            risingEdge,
            lines: this.lines.slice(startIndex, i),
            resets
          });
        }
      }
    }
  }
  findRegisters() {
    for (const wire of this.wires) {
      if (wire.type !== 'in') {
        for (const process of this.processes) {
          for (const line of process.lines) {
            re = new RegExp(`^\\s*${wire.name}+\\s*<=.*`, 'i');
            if (m = re.exec(line)) {
              wire.register = process;
              break;
            }
          }
          if (wire.register) {
            break;
          }
        }
      }
    }
  }
  checkResets() {
    for (const wire of this.wires) {
      if (wire.register) {
        let found = false;
        for (const proc of this.processes) {
          if (proc.resets.indexOf(wire.name) > -1) {
            found = true;
          }
        }
        if (!found) {
          this.messages.push({
            severity: 'error',
            location: {
              file: this.editorPath,
              position: new Range(new Point(wire.register.startIndex + 3, 0), new Point(wire.register.risingEdge - 1, Infinity)),
            },
            excerpt: `${wire.type} ${wire.name} not reseted!11!!`,
            description: ``
          });
        }
      }
    }
  }
  checkUnused() {
    for (const wire of this.wires) {
      const linesFound = this.lines.filter(line => line.indexOf(wire.name) > -1)
      // console.log(linesFound, lines);
      if (linesFound.length < 2) {
        this.messages.push({
          severity: 'warning',
          location: {
            file: this.editorPath,
            position: new Range(new Point(wire.lineNumber, 0), new Point(wire.lineNumber, Infinity)),
          },
          excerpt: `${wire.type} ${wire.name} unused`,
          description: ``
        });
      }
    }
  }
  checkAll() {
    this.checkResets();
    this.checkUnused();
    this.checkUndefinedWrites();
    return this.messages;
  }
}

export function provideLinter() {
  return {
    name: 'Boss-Linter',
    scope: 'file', // or 'project'
    lintsOnChange: true, // or true
    grammarScopes: ['source.vhdl'],
    lint(textEditor) {
      const vhdlLinter = new VhdlLinter(textEditor);
      const messages = vhdlLinter.checkAll();
      // console.log(messages);
      return messages;
    }
  }
}
