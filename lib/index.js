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
export function findLine(text, positionStart, positionEnd) {
  let row = 0;
  let col = 0;
  let start, end;
  for (let i = 0; i < text.length; i++) {
    if (text[i] == '\n') {
      row++;
      col = 0;
    } else {
      col++;
    }
    if (i == positionStart) {
      start = new Point(row, col);
    }
    if (i == positionEnd) {
      end = new Point(row, col);
    }
  }
  return new Range(start, end);
}
export function checkUnused(editor) {
  const editorPath = editor.getPath()
  const messages = [];
  let text = editor.getText();
  let lines = text.split('\n').map(line => {
    return line.replace(/--.*/, '');
  });
  let wires = [];
  for (const [lineNumber, line] of lines.entries()) {
    let re = /^\s*signal\s+(\S+)/;
    if (m = re.exec(line)) {
      wires.push({
        lineNumber,
        name: m[1],
        type: 'signal'
      });
    }
    re = /^\s*(\S+)\s*:\s*(out|in|inout)/i;
    if (m = re.exec(line)) {
      wires.push({
        lineNumber,
        name: m[1],
        type: m[2]
      });
    }

  }

  const processes = [];
  let resets = [];
  let processMode = false;
  let regProcMode = false;
  let startIndex = -1;
  for (const [i, line] of lines.entries()) {
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
      }
      re = /^\s*(\S+)\s*<=.*/i;
      if (!regProcMode && (m = re.exec(line))) {
        resets.push(m[1]);
      }
      re = /^\s*end\s+process/i;
      if (m = re.exec(line)) {
        processMode = false;
        processes.push({
          startIndex: startIndex,
          lines: lines.slice(startIndex, i),
          resets: resets
        });
      }
    }
  }

  for (const wire of wires) {
    if (wire.type !== 'in') {
      for (const proc of processes) {
        for (const line of proc.lines) {
          re = new RegExp(`^\\s*${wire.name}+\\s*<=.*`, 'i');
          if (m = re.exec(line)) {
            wire.register = true;
            break;
          }
        }
        if (wire.register) {
          break;
        }
      }
    }
  }
  for (const wire of wires) {
    if (wire.register) {
      for (const proc of processes) {
        if (proc.resets.indexOf(wire.name) === -1) {
          messages.push({
            severity: 'error',
            location: {
              file: editorPath,
              position: new Range(new Point(wire.lineNumber, 0), new Point(wire.lineNumber, Infinity)),
            },
            excerpt: `${wire.type} ${wire.name} not reseted!11!!`,
            description: ``
          });
        }
      }
    }
  }
  console.log(processes);
  console.log(wires);

  for (const wire of wires) {
    const linesFound = lines.filter(line => line.indexOf(wire.name) > -1)
    // console.log(linesFound, lines);
    if (linesFound.length < 2) {
      messages.push({
        severity: 'warning',
        location: {
          file: editorPath,
          position: new Range(new Point(wire.lineNumber, 0), new Point(wire.lineNumber, Infinity)),
        },
        excerpt: `${wire.type} ${wire.name} unused`,
        description: ``
      });
    }
  }
  // console.log(messages);
  return messages;
}
export function provideLinter() {
  return {
    name: 'Boss-Linter',
    scope: 'file', // or 'project'
    lintsOnChange: false, // or true
    grammarScopes: ['source.vhdl'],
    lint(textEditor) {
      let messages = [];
      messages = messages.concat(checkUnused(textEditor));
      // console.log(messages);
      return messages;
    }
  }
}
