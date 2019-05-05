import * as React from 'react';
import {OSignalLike, OInstantiation} from './parser/objects';
import {Viewer} from './viewer';
import {Point} from 'atom';
export interface IProps {
  instantiations: OInstantiation[];
}

export interface IState {
  bodyVisible: boolean;
}
export class InstantiationsViewer extends Viewer<IProps, IState> {
  constructor(props: any) {
    super(props);
    this.state = {
      bodyVisible: true
    };
  }
  render() {
    return <div className={'vhdl-instantiation-list'}>
      <h4 className='vhdl-list-header' onClick={() => this.setState({bodyVisible: !this.state.bodyVisible})}>Instantiations</h4>
      {this.state.bodyVisible &&
      <div className={'vhdl-instantiation-list-body'}>
        {
          this.props.instantiations.map(instantiation => {
            return <div className = 'vhdl-instantiation' onClick={() => this.jumpToI(instantiation.startI)} title={instantiation.componentName}>
             {instantiation.label}
            </div>;
          })
        }
        </div>
      }
    </div>;
  }
}
