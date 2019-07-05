import * as React from 'react';
import {OSignalLike} from '../parser/objects';
import {BaseViewer} from './baseViewer';
export interface IProps {
  signalLikes: OSignalLike[];
  type: string;
  classCallback?: (signalLike: OSignalLike) => string;
  header: string;
}
export interface IState {
  bodyVisible: boolean;
  sortAlpha: boolean;
}
export class SignalLikeViewer extends BaseViewer<IProps, IState> {
  constructor(props: any) {
    super(props);
    this.state = {
      bodyVisible: true,
      sortAlpha: false
    };
  }
  render() {
    const signalLikeSorted = this.state.sortAlpha ? [...this.props.signalLikes].sort((a, b) => a.name > b.name ? 1 : -1) : this.props.signalLikes;
    const className = 'vhdl-' + this.props.type + '-list ' + (this.state.bodyVisible ? 'vhdl-body-visible' : 'vhdl-body-hidden');
    return <div className={className}>
      <div className='vhdl-list-header'>
        <div className='vhdl-list-header-show' onClick={() => this.setState({bodyVisible: !this.state.bodyVisible})}></div>
        <div className='vhdl-list-header-title' onClick={() => this.setState({bodyVisible: !this.state.bodyVisible})}>{this.props.header}</div>
        <div className='vhdl-list-header-sort' onClick={(evt) => {evt.preventDefault(); this.setState({sortAlpha: !this.state.sortAlpha}); }}>⇅</div>
      </div>
      <div className={'vhdl-' + this.props.type + '-list-body vhdl-list-body'}>
        {
          signalLikeSorted.map(signalLike => {
            let className = 'vhdl-' + this.props.type;
            if (this.props.classCallback) {
              className += ' ' + this.props.classCallback(signalLike);
            }
            const typeClassName = 'vhdl-type vhdl-type-' + signalLike.type.replace(/\(.*/, '').replace(/ .*/, '');
            return <div className = {className} onClick={() => this.jumpToI(signalLike.startI)} title={signalLike.type}>
             <span className={typeClassName}>{signalLike.name}</span>
            </div>;
          })
        }
        </div>
    </div>;
  }
}
