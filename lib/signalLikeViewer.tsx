import * as React from 'react';
import {OSignalLike} from './parser/objects';
import {Viewer} from './viewer';
import {Point} from 'atom';
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
export class SignalLikeViewer extends Viewer<IProps, IState> {
  constructor(props: any) {
    super(props);
    this.state = {
      bodyVisible: true,
      sortAlpha: false
    };
  }
  render() {
    const signalLikeSorted = this.state.sortAlpha ? [...this.props.signalLikes].sort((a, b) => a.name > b.name ? 1 : -1) : this.props.signalLikes;

    return <div className={'vhdl-' + this.props.type + '-list'}>
      <h4 className='vhdl-list-header'>
        <span className='vhdl-list-header-show' onClick={() => this.setState({bodyVisible: !this.state.bodyVisible})}>{this.props.header}</span>
        <span className='vhdl-list-header-sort' onClick={(evt) => {evt.preventDefault(); this.setState({sortAlpha: !this.state.sortAlpha}); }}>⇅</span>
      </h4>
      {this.state.bodyVisible &&
      <div className={'vhdl-' + this.props.type + '-list-body'}>
        {
          signalLikeSorted.map(signalLike => {
            let className = 'vhdl-' + this.props.type;
            if (this.props.classCallback) {
              className += ' ' + this.props.classCallback(signalLike);
            }
            return <div className = {className} onClick={() => this.jumpToI(signalLike.startI)}>
             {signalLike.name}
            </div>;
          })
        }
        </div>
      }
    </div>;
  }
}
