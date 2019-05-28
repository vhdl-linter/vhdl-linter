import {OFile} from './parser/objects';
import { Parser } from './parser/parser';
import {BrowserView} from './browserView';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

export class Browser {
  private tree: OFile;
  constructor() {
  }
  getView() {
    const container = document.createElement('div');
    // console.log('Browser constr');
    atom.workspace.observeActiveTextEditor(editor => {
      // console.log('editorChange', editor);
      if (!editor || editor.getGrammar().name !== 'VHDL') {
        container.style.display = 'none';
        return;
      }
      container.style.display = 'block';
      const parser = new Parser(editor.getText(), editor.getPath() || '');
      try {
        this.tree = parser.parse();
        if (this.tree) {
          ReactDOM.render(
              React.createElement(BrowserView, {tree: this.tree}),
              container
          );
        }

      } catch (e) {
      }
    });
    return container;
  }
}
export const browser = new Browser();
