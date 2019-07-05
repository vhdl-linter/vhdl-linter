import * as React from 'react';
import {OArchitecture, OSignal, OForGenerate, OIfGenerate} from '../parser/objects';
import {ArchitectureViewer} from './architectureViewer';
import {BaseViewer} from './baseViewer';
import Highlight from 'react-highlight';

export interface IProps {
  generate: OForGenerate|OIfGenerate;
}

export interface IState {
  bodyVisible: boolean;
}

export class GenerateViewer extends BaseViewer<IProps, IState> {
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
      let text = editor.lineTextForBufferRow(pos.row).trim();

    return <div className={'vhdl-generate-list ' + (this.state.bodyVisible ? 'vhdl-body-visible' : 'vhdl-body-hidden')}>
      <div className='vhdl-list-header'>
        <div className='vhdl-list-header-show' onClick={() => this.setState({bodyVisible: !this.state.bodyVisible})}> </div>
        <div className='vhdl-list-header-title' onClick={() => this.setState({bodyVisible: !this.state.bodyVisible})}>
        <Highlight className='vhdl'>{text}</Highlight>
        </div>
      </div>
      <div className='vhdl-generate-body vhdl-list-body'>
        <ArchitectureViewer architecture={generate} isEntity={false}></ArchitectureViewer>
      </div>
    </div>;
  }
}
