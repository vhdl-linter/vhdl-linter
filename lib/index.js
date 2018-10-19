'use babel'
'use strict'
import {
  Range,
  Point
} from 'atom'

export function activate() {
  // Fill something here, optional
}

export function deactivate() {
  // Fill something here, optional
}

class VhdlLinter {
  processes = [];
  wires = [];
  messages = [];
  states = [];
  constructor(editor) {
    this.editorPath = editor.getPath();
    this.text = editor.getText();
    this.lines = this.text.split('\n').map(line => {
      return line.replace(/--.*/, '');
    });
    this.parser();
    this.findProcesses();
    this.findStates();
  }
  checkAll() {
    this.checkResets();
    this.checkUnused();
    this.checkUndefineds();
    return this.messages;
  }
  parseWrite(writeText) {

    let re = /\([^())]*\)/i;
    while (m = re.exec(writeText)) {
      writeText = writeText.replace(re, '');
    }
    writeText = writeText.trim();
    return writeText.match(/^[^.]*/)[0];

  }
  parseRead(readText, lineNumber) {
    readText = ' ' + readText;
    let noneFunctionBracesRegExp = /([^a-z0-9_])\(([^()]*)\)/i;
    let functionBracesRegExp = /[a-z_0-9]+\(([^()]*)\)/i;

    let m, m2;
    while ((readText.match(noneFunctionBracesRegExp) !== null) || (readText.match(functionBracesRegExp) !== null)) {
      readText = readText.replace(noneFunctionBracesRegExp, (...m) => m[1] + m[2]);
      readText = readText.replace(functionBracesRegExp, (...m) => m[1]);
    }
    readsFinal = [];
    readText = readText.trim();
    reads = readText.split(/\s|,|\+|-|\*/i);
    const keywords = ['+', '-', 'not', 'or', 'and', 'when', 'else', '>', '<', '=', '=>', '/=', 'downto', 'others', '/', '&', '*', 'open', 'mod']
    for(const read of reads) {
      if (read == '') {
        continue;
      }
      if (keywords.indexOf(read.toLowerCase()) > -1) {
        continue;
      }
      if (read.match(/^[0-9]+$/) !== null) {
        continue;
      }
      if (read.match(/^'.*'$/) !== null) {
        continue;
      }
      if (read.match(/^x?".*"$/) !== null) {
        continue;
      }

      readsFinal.push(read.match(/^[^.']*/i)[0]);
    }
    return readsFinal;
  }
  findStates() {
    for (const [lineNumber, line] of this.lines.entries()) {
      let re = /^\s*type.*is.*\(([^)]+)\)\s*;/i;
      if (m = re.exec(line)) {
        m[1].split(',').forEach(state => {
          state = state.trim();
          this.states.push({
            name: state
          });
        });
      };
    }
  }
  parser() {
    let mode = 'root';
    this.writes = [];
    this.reads = [];
    for (const [lineNumber, line] of this.lines.entries()) {
      // this.messages.push({
      //   severity: 'warning',
      //   location: {
      //     file: this.editorPath,
      //     position: new Range(new Point(lineNumber, 0), new Point(lineNumber, Infinity)),
      //   },
      //   excerpt: `mode: ${mode}!`,
      //   description: ``
      // });
      if (mode == 'root') {
        if (line.match(/^\s*entity\s+(\S)+\s+is/i) !== null) {
          mode = 'entity';
        }
        if (line.match(/^\s*architecture/i) !== null) {
          mode = 'signal-definition';
        }
      } else if (mode == 'entity') {
        if (line.match(/^\s*generic\s*\(/i) !== null) {
          mode = 'generic';
        } else if (line.match(/^\s*port\s*\(/i) !== null) {
          mode = 'ports';
        } else if (line.match(/^\s*end\s+entity/i) !== null) {
          mode = 'root';
        }
      } else if (mode == 'generic') {
        if (line.match(/^\s*\)\s*;/i) !== null) {
          mode = 'entity';
          continue;
        }
        let match = line.match(/^\s*(\S+)\s*:\s*(\S+)/i);
        if (match !== null) {
          this.wires.push({
            definitionLineNumber: lineNumber,
            name: match[1],
            type: 'generic'
          })
        }
      } else if (mode == 'ports') {
        if (line.match(/^\s*\)\s*;/i) !== null) {
          mode = 'entity';
          continue;
        }
        let match = line.match(/^\s*(\S+)\s*:\s*(\S+)\s+(\S+)/i);
        if (match !== null) {
          this.wires.push({
            definitionLineNumber: lineNumber,
            name: match[1],
            type: match[2]
          })
        }
      } else if (mode == 'signal-definition') {
        let match = line.match(/^\s*signal\s+(\S+)/i);
        if (match !== null) {
          this.wires.push({
            definitionLineNumber: lineNumber,
            name: match[1],
            type: 'signal'
          });
        }
        if (line.match(/^\s*begin/i) !== null) {
          mode = 'architecture';
        }
      } else if (mode === 'architecture') {
        if (line.match(/^\s*port\s+map\s+\(/i) !== null) {
          mode = 'portmap';
          continue;
        }
        if (line.match(/^\s*(if|elsif)[^a-z_]/i) !== null) {
          // TODO
          continue;
        }
        let match = line.match(/(.*)<=([^;]*)/i);
        if (match !== null) {
          const write = this.parseWrite(match[1]);
          if (write !== '') {
            this.writes.push({
              name: write,
              nameLowerCase: write.toLowerCase(),
              lineNumber
            });

          }
          for (const read of this.parseRead(match[2], lineNumber)) {
            this.reads.push({
              name: read,
              nameLowerCase: read.toLowerCase(),
              lineNumber
            });
          }
          if (line.match(/;\s*$/i) !== null) {
            // mode = 'assignment';
          }
        }
      } else if (mode === 'portmap') {
        if (line.match(/^\s*\)\s*;/i) !== null) {
          mode = 'architecture';
          continue;
        }
        let match = line.match(/([^=]*)=>(.*)/i);
        if (match === null) {
          continue;
        }
        match[2] = match[2].replace(/,$/, '');
        let portName = match[1].trim();
        if (match !== null) {
          for (const portMapping of this.parseRead(match[2], lineNumber)) {
            if (portName.match(/^i_/i) !== null || portName.match(/_i$/i) !== null) {
              this.reads.push({
                name: portMapping,
                nameLowerCase: portMapping.toLowerCase(),
                lineNumber
              });
            } else if (portName.match(/^o_/i) !== null || portName.match(/_o$/i) !== null) {
              this.writes.push({
                name: portMapping,
                nameLowerCase: portMapping.toLowerCase(),
                lineNumber
              });
            } else {
              this.writes.push({
                name: portMapping,
                nameLowerCase: portMapping.toLowerCase(),
                lineNumber
              });
              this.reads.push({
                name: portMapping,
                nameLowerCase: portMapping.toLowerCase(),
                lineNumber
              });

            }
          }
        }
      }
    }
  }
  checkUndefineds() {
    const undefineds = [];
    for(const writeRead of this.writes.concat(this.reads)) {
      const matchingWires = this.wires.concat(this.states).filter(wire => {
        return wire.name.toLowerCase() === writeRead.nameLowerCase;
      });
      if (matchingWires.length === 0) {
        if (writeRead.name.match(/^(c|v)_/i) !== null) {
          //Probably constant
        } else {
          undefineds.push(writeRead);
        }
      }
    }
    for (const undefined of undefineds) {
      this.messages.push({
        severity: 'error',
        location: {
          file: this.editorPath,
          position: new Range(new Point(undefined.lineNumber, 0), new Point(undefined.lineNumber, Infinity)),
        },
        excerpt: `${undefined.name} not defined!`,
        description: ``
      });
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
          let foundReset  = proc.resets.find(reset => reset.toLowerCase() === wire.name.toLowerCase());
          if (typeof foundReset !== 'undefined') {
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
      const wireName = wire.name.toLowerCase();
      if (typeof this.reads.concat(this.writes).find(readWrite => readWrite.nameLowerCase === wireName) === '') {
        this.messages.push({
          severity: 'warning',
          location: {
            file: this.editorPath,
            position: new Range(new Point(wire.definitionLineNumber, 0), new Point(wire.definitionLineNumber, Infinity)),
          },
          excerpt: `${wire.type} ${wire.name} unused`,
          description: ``
        });
      }
    }
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
      return messages;
    }
  }
}
