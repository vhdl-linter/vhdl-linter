import * as React from 'react';
import {OProcess} from './parser/objects';
import {Viewer} from './viewer';
export interface IProps {
  processes: OProcess[];
}

export interface IState {
  bodyVisible: boolean;
  sortAlpha: boolean;
}
export class ProcessViewer extends Viewer<IProps, IState> {
  constructor(props: any) {
    super(props);
    this.state = {
      sortAlpha: false,
      bodyVisible: true
    };
  }
  render() {
    const sorted = this.state.sortAlpha ? [...this.props.processes].sort((a, b) => {
      if (typeof a.label === 'undefined' && b.label === 'undefined') {
        return 0;
      }
      if (typeof a.label === 'undefined') {
        return -1;
      }
      if (typeof b.label === 'undefined') {
        return 1;
      }
      return a.label > b.label ? 1 : -1;
    }) : this.props.processes;
    const className = 'vhdl-process-list ' + (this.state.bodyVisible ? 'vhdl-body-visible' : 'vhdl-body-hidden');

    return <div className={className}>
      <h4 className='vhdl-list-header'>
        <span className='vhdl-list-header-show' onClick={() => this.setState({bodyVisible: !this.state.bodyVisible})}>
          Processes
        </span>
        <span className='vhdl-list-header-sort' onClick={(evt) => {evt.preventDefault(); this.setState({sortAlpha: !this.state.sortAlpha}); }}>⇅</span>

      </h4>
      <div className={'vhdl-process-list-body vhdl-list-body'}>
        {
          sorted.map(process => {
            return <div className = 'vhdl-process'>
             {process.isRegisterProcess() ? 'reg: ' : ''}<span className = 'vhdl-process-label' onClick={() => this.jumpToI(process.startI)} title={process.label}>{process.label}</span>
             {process.getStates().map(state => {
               return <div className='vhdl-state' onClick={() => this.jumpToI(state.startI)}>{state.name}</div>;
             })}
            </div>;
          })
        }
        </div>
    </div>;
  }
}
