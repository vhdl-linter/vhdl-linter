import * as React from 'react';
import {OArchitecture, OSignal, OForGenerate, OIfGenerate} from './parser/objects';
import {ArchitectureViewer} from './architectureViewer';
import {Viewer} from './viewer';
import Highlight from 'react-highlight';

export interface IProps {
  generate: OForGenerate|OIfGenerate;
}

export interface IState {
  bodyVisible: boolean;
}

export class GenerateViewer extends Viewer<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {bodyVisible: true};
  }
  render() {
    const {generate} = this.props;
      const editor = atom.workspace.getActiveTextEditor();
      if (!editor) {
        return;
      }
      const pos = this.getPositionFromI(generate.startI, editor.getText());
      let i = 1;
      let text = '';
      do {
        text = editor.lineTextForBufferRow(pos.row - i);
        i++;
      } while (text.trim() === '');

    return <div className={'vhdl-generate-list ' + (this.state.bodyVisible ? 'vhdl-body-visible' : 'vhdl-body-hidden')}>
      <div className='vhdl-list-header'>
        <span className='vhdl-list-header-show' onClick={() => this.setState({bodyVisible: !this.state.bodyVisible})}></span>
        <Highlight className='vhdl'>{text}</Highlight>
      </div>
      <div className='vhdl-generate-body vhdl-list-body'>
        <ArchitectureViewer architecture={generate} isEntity={false}></ArchitectureViewer>
      </div>
    </div>;
  }
}
