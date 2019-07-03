import * as React from 'react';
import {OArchitecture, OSignal, OForGenerate, OIfGenerate} from './parser/objects';
import {ArchitectureViewer} from './architectureViewer';
export interface IProps {
  generate: OForGenerate|OIfGenerate;
}

export interface IState {
  bodyVisible: boolean;
}

export class GenerateViewer extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {bodyVisible: true};
  }
  render() {
    const {generate} = this.props;
    return <div className={'vhdl-generate-list ' + (this.state.bodyVisible ? 'vhdl-body-visible' : 'vhdl-body-hidden')}>
      <div className='vhdl-list-header'>
        <span className='vhdl-list-header-show' onClick={() => this.setState({bodyVisible: !this.state.bodyVisible})}>{generate instanceof OForGenerate ? generate.variable : generate.conditions.join(', ')}</span>
      </div>
      <div className='vhdl-generate-body'>
        <ArchitectureViewer architecture={generate} isEntity={false}></ArchitectureViewer>
      </div>
    </div>;
  }
}
