import {Component} from 'react';
import * as React from 'react';
import {OFile, OPort, OSignal, OSignalLike} from './parser/objects';
import {Point} from 'atom';
import {SignalLikeViewer} from './signalLikeViewer';
import {InstantiationsViewer} from './instantiationsViewer';
import {ProcessViewer} from './processViewer';
export interface IProps {
  tree: OFile;
}

export class BrowserView extends React.Component<IProps, {}> {
  render() {
    const {tree} = this.props;
    return <div className='vhdl-browser'>
      <h3 className='vhdl-entity-name'>{tree.entity.name}</h3>
      <div className='vhdl-scroll'>
          <SignalLikeViewer signalLikes={tree.entity.generics as OSignalLike[]} type='generic' header='Generics'></SignalLikeViewer>
          <SignalLikeViewer signalLikes={tree.entity.ports} type='port' classCallback = {(port: OPort) => 'vhdl-port-' + port.direction} header='Ports'></SignalLikeViewer>
          <SignalLikeViewer signalLikes={tree.architecture.signals} type='signal' classCallback = {(signal: OSignal) => signal.isRegister() ? 'vhdl-signal-register' : signal.constant ? 'vhdl-signal-constant' : ''} header='Signals'></SignalLikeViewer>
          <InstantiationsViewer instantiations={tree.architecture.instantiations}></InstantiationsViewer>
          <ProcessViewer processes={tree.architecture.processes}></ProcessViewer>
      </div>
    </div>;
    // <div className='vhdl-portmap'>
    // {
      //   tree.entity.generics.map(generic => {
        //     return <div className = 'vhdl-generic' onClick={() => this.jumpToI(generic.startI)}>
        //      {generic.name}
        //     </div>;
        //   })
        // }
    // {
      //   tree.architecture.signals.map(signal => {
        //     let className = 'vhdl-signal';
        //     if (signal.constant) {
          //       className += ' vhdl-signal-constant';
          //     }
          //     if (signal.isRegister()) {
            //       className += ' vhdl-signal-register';
            //     }
            //     return <div className = {className} onClick={() => this.jumpToI(signal.startI)}>
            //        {signal.name}
            //     </div>;
            //   })
            // }
            // </div>
  }
}
