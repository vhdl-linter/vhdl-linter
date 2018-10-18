'use babel'
import {Range, Point} from 'atom'

console.log('hi');
export function activate() {
  console.log('hi');
  // Fill something here, optional
}

export function deactivate() {
  // Fill something here, optional
}
export function findLine (text, positionStart, positionEnd) {
  let row = 0;
  let col = 0;
  let start, end;
  for(let i = 0; i < text.length; i++) {
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
  let signals = [];
  for (const [lineNumber, line] of lines.entries()) {
    let re = /^\s*signal\s+(\S+)/;
    if (m = re.exec(line)) {
      signals.push({
        lineNumber,
        name: m[1],
        type: 'signal'
      });
    }
    re = /^\s*(\S+)\s*:\s*(out|in|inout)/i;
    if (m = re.exec(line)) {
      signals.push({
        lineNumber,
        name: m[1],
        type: m[2]
      });
    }


  }
  for (const signal of signals) {
    const linesFound = lines.filter(line => line.indexOf(signal.name) > -1)
    console.log(linesFound, lines);
    if (linesFound.length < 2) {
      messages.push({
        severity: 'warning',
        location: {
          file: editorPath,
          position: new Range(new Point(signal.lineNumber, 0), new Point(signal.lineNumber, 99)),
        },
        excerpt: `${signal.type} ${signal.name} unused`,
        description: ``
      });
    }
  }
  // console.log(messages);
  return messages;
}
export function checkReset(editor) {
  const editorPath = editor.getPath()
  const messages = [];
  let text = editor.getText();
  // console.log(typeof text, text.length);
  const re = /^\s+signal\s+(r_\S+)/mgi;
  let registers = [];
  while (m = re.exec(text)) {
    registers.push({
      name: m[1],
      position: findLine(text, m.index, m[0].length + m.index)
    });
  }
  let resetBlocks = [];
  const reResetBlock = /if i_reset[^\n]*then([\s\S]*?)\n\s*(?:els|end)/gim
  while (m = reResetBlock.exec(text)) {
    resetBlocks.push(m[1]);
  }
  // console.log(registers, resetBlocks, 'found');
  let missedRegisters = registers.filter(register => {
    return resetBlocks.reduce((acc, resetBlock) => {
      if (acc === false) {
        return false;
      }
      return resetBlock.toLowerCase().search(register.name.toLowerCase()) === -1;
    }, true);
  });
  for (const missedRegister of missedRegisters) {
    messages.push({
      severity: 'error',
      location: {
        file: editorPath,
        position: missedRegister.position,
      },
      excerpt: `register ${missedRegister.name} is not reset`,
      description: ``
    });
  }
  return messages;
}
export function provideLinter() {
  return {
    name: 'Example',
    scope: 'file', // or 'project'
    lintsOnChange: true, // or true
    grammarScopes: ['source.vhdl'],
    lint(textEditor) {
      let messages = [];
      messages = messages.concat(checkUnused(textEditor));
      messages = messages.concat(checkReset(textEditor));
      console.log(messages);
      return messages;
    }
  }
}
