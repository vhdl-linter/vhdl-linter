import * as React from 'react';
import {Point} from 'atom';

export class BaseViewer<IProps, IState> extends React.Component<IProps, IState> {
  getPositionFromI(i: number, text: string): Point {
    let row = 0;
    let col = 0;
    for (let count = 0; count < i; count++) {
      if (text[count] === '\n') {
        row++;
        col = 0;
      } else {
        col++;
      }
    }
    return new Point(row, col);
  }
  jumpToI(i: number) {
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) {
      return;
    }
    let pos = this.getPositionFromI(i, editor.getText());
    editor.setCursorBufferPosition(pos, {autoscroll: false});
    editor.scrollToCursorPosition({center: true});
  }
}
