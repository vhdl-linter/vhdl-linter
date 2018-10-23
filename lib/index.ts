import {TextEditor} from 'atom'

export function activate() {
  // Fill something here, optional
}

export function deactivate() {
  // Fill something here, optional
}

class VhdlLinter {
  text: string;
  editorPath: string;
  messages = [];
  constructor(editor: TextEditor) {
    let path = editor.getPath();
    if (!path) {
      return;
    }
    this.editorPath = path;
    this.text = editor.getText();
  }
  checkAll() {
    // this.checkResets();
    // this.checkUnused();
    // this.checkUndefineds();
    return this.messages;
  }

}

export function provideLinter() {
  return {
    name: 'Boss-Linter',
    scope: 'file', // or 'project'
    lintsOnChange: true, // or true
    grammarScopes: ['source.vhdl'],
    lint(textEditor: TextEditor) {
      const vhdlLinter = new VhdlLinter(textEditor);
      const messages = vhdlLinter.checkAll();
      return messages;
    }
  }
}
