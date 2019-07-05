import * as React from 'react';
import {OArchitecture, OSignal, OForGenerate, OIfGenerate} from '../parser/objects';
import {SignalLikeViewer} from './signalLikeViewer';
import {InstantiationsViewer} from './instantiationsViewer';
import {ProcessViewer} from './processViewer';
import {GenerateViewer} from './generateViewer';
export interface IProps {
  architecture: OArchitecture;
  isEntity: boolean;
}

export class ArchitectureViewer extends React.Component<IProps, {}> {
  render() {
    const {architecture} = this.props;
    return <div className='vhdl-architecture-browser'>
    {(architecture.signals.length > 0 || this.props.isEntity) && <SignalLikeViewer signalLikes={architecture.signals} type='signal' classCallback = {(signal: OSignal) => signal.isRegister() ? 'vhdl-signal-register' : signal.constant ? 'vhdl-signal-constant' : ''} header='Signals'></SignalLikeViewer>}
      {(architecture.instantiations.length > 0 || this.props.isEntity) && <InstantiationsViewer instantiations={architecture.instantiations}></InstantiationsViewer>}
      {(architecture.processes.length > 0 || this.props.isEntity) && <ProcessViewer processes={architecture.processes}></ProcessViewer>}
      {architecture.generates.sort((a, b) => a.startI - b.startI).map((generate) =>
          <GenerateViewer generate={generate as OForGenerate|OIfGenerate} ></GenerateViewer>
        )}
    </div>;
  }
}
