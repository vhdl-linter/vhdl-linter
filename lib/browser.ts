import {OFile} from './parser/objects';
import { Parser } from './parser/parser';
import {BrowserView} from './browserView';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

export class Browser {
  container = document.createElement('div');
  private tree: OFile;
  constructor() {
    this.container.classList.add('tool-panel', 'resizable-right-panel');
    atom.workspace.observeActiveTextEditor(editor => {
      console.log('editorChange', editor);
      if (!editor || editor.getGrammar().name !== 'VHDL') {
        this.container.style.display = 'none';
        return;
      }
      this.container.style.display = 'block';
      const parser = new Parser(editor.getText(), editor.getPath() || '');
      try {
        this.tree = parser.parse();
        if (this.tree) {
          ReactDOM.render(
              React.createElement(BrowserView, {tree: this.tree}),
              this.container
          );
        }

      } catch (e) {
      }
    });
  }
  getView() {
    return atom.views.addViewProvider(model => {
      // this.container = document.createElement('div');

      // this.render();
      return this.container;
    });
  }
}
export const browser = new Browser();
