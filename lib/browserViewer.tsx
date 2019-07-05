import * as React from 'react';
import {OFile, OPort, OSignal, OSignalLike} from './parser/objects';
import {SignalLikeViewer} from './signalLikeViewer';
import {ArchitectureViewer} from './architectureViewer';
export interface IProps {
  tree: OFile;
}

export class BrowserViewer extends React.Component<IProps, {}> {
  private resizeContainer = React.createRef<HTMLDivElement>();
  private resizeBar = React.createRef<HTMLDivElement>();
  render() {
//    console.log('render');
    const {tree} = this.props;
    return <div className='vhdl-browser'>
      <link rel='stylesheet' href='../node_modules/highlight.js/styles/atom-one-dark.css'/>
      <div className='vhdl-resize-bar' onMouseDown={e => this.initDrag(e)} ref={this.resizeBar}></div>
      <div className='vhdl-resize-container' ref={this.resizeContainer}>
        <h3 className='vhdl-entity-name'>{tree.entity.name}</h3>
        <div className='vhdl-scroll'>
            <SignalLikeViewer signalLikes={tree.entity.generics as OSignalLike[]} type='generic' header='Generics'></SignalLikeViewer>
            <SignalLikeViewer signalLikes={tree.entity.ports} type='port' classCallback = {(port: OPort) => 'vhdl-port-' + port.direction} header='Ports'></SignalLikeViewer>
            <ArchitectureViewer architecture={tree.architecture} isEntity={false}></ArchitectureViewer>
        </div>
      </div>
    </div>;
  }
  initDrag(e: any) {
    // console.log(this.resizeContainer.current, this.resizeBar.current);
    if (!this.resizeContainer.current) {
      return;
    }
    const doDrag = (e: any) => {
      if (this.resizeContainer.current) {
        // console.log(this.resizeContainer.current.offsetLeft, this.resizeContainer.current.offsetWidth, e.clientX, this.resizeContainer.current.offsetLeft + this.resizeContainer.current.offsetWidth - e.clientX);
        this.resizeContainer.current.style.width = (this.resizeContainer.current.getBoundingClientRect().left + this.resizeContainer.current.offsetWidth - e.clientX) + 'px';
      }
    };
    const stopDrag = () => {
      if (this.resizeBar.current) {
        window.removeEventListener('mousemove', doDrag, false);
        window.removeEventListener('mouseup', stopDrag, false);
      }
    };
    window.addEventListener('mousemove', doDrag, false);
    window.addEventListener('mouseup', stopDrag, false);
  }
}
