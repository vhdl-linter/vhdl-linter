import * as React from 'react';
import {OInstantiation} from './parser/objects';
import {Viewer} from './viewer';
export interface IProps {
  instantiations: OInstantiation[];
}

export interface IState {
  bodyVisible: boolean;
  sortAlpha: boolean;
}
export class InstantiationsViewer extends Viewer<IProps, IState> {
  constructor(props: any) {
    super(props);
    this.state = {
      sortAlpha: false,
      bodyVisible: true
    };
  }
  render() {
    const sorted = this.state.sortAlpha ? [...this.props.instantiations].sort((a, b) => {
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
    }) : this.props.instantiations;
    const className = 'vhdl-instantiation-list ' + (this.state.bodyVisible ? 'vhdl-body-visible' : 'vhdl-body-hidden');

    return <div className={className}>
      <div className='vhdl-list-header'>
        <span className='vhdl-list-header-show' onClick={() => this.setState({bodyVisible: !this.state.bodyVisible})}>
          Instantiations
        </span>
        <span className='vhdl-list-header-sort' onClick={(evt) => {evt.preventDefault(); this.setState({sortAlpha: !this.state.sortAlpha}); }}>⇅</span>

      </div>
      <div className={'vhdl-instantiation-list-body vhdl-list-body'}>
        {
          sorted.map(instantiation => {
            return <div className = 'vhdl-instantiation' onClick={() => this.jumpToI(instantiation.startI)} title={instantiation.componentName}>
             {instantiation.label}
            </div>;
          })
        }
        </div>
    </div>;
  }
}
