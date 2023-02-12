import { EventEmitter } from "stream";
import { CancellationToken, CancellationTokenSource, LSPErrorCodes, ResponseError } from "vscode-languageserver";
import { Elaborate } from "./elaborate/elaborate";
import { normalizeUri } from "./normalize-uri";
import { ProjectParser } from "./project-parser";
import { SettingsGetter, VhdlLinter } from "./vhdl-linter";

interface ILinterState {
  wasAlreadyValid?: boolean; // Was already once valid (=the linters object has a valid linter)
  valid?: boolean; // Is currently valid
  done: boolean;
}
export class LinterManager {
  // We do not actually care for the linter were the parsing failed.
  // So this will always point to working linter
  // The state has to be evaluated to see if it is current
  private linters: Record<string, VhdlLinter> = {};

  state: Record<string, ILinterState> = {};
  private emitter = new EventEmitter();

  async getLinter(uri: string, token?: CancellationToken, preferOldOverWaiting = true) {
    uri = normalizeUri(uri);
    while (this.state[uri]?.done !== true || (preferOldOverWaiting && this.state[uri]?.wasAlreadyValid !== true) || (preferOldOverWaiting === false && this.state[uri]?.valid !== true)) {
      if (token?.isCancellationRequested) {
        throw new ResponseError(LSPErrorCodes.RequestCancelled, 'canceled');
      }
      await new Promise(resolve => this.emitter.once(uri, resolve));
    }
    if (token?.isCancellationRequested) {
      throw new ResponseError(LSPErrorCodes.RequestCancelled, 'canceled');
    }
    const linter = this.linters[uri];
    if (!linter) {
      throw new Error('Should have linter');
    }
    return linter;
  }
  cancellationTokenSources: Record<string, CancellationTokenSource> = {};
  async triggerRefresh(uri: string, text: string, projectParser: ProjectParser, settingsGetter: SettingsGetter) {
    uri = normalizeUri(uri);
    const oldSource = this.cancellationTokenSources[uri];
    if (oldSource) {
      oldSource.cancel();
    }
    const newSource = new CancellationTokenSource();
    this.cancellationTokenSources[uri] = newSource;
    const url = new URL(uri);
    const state = this.state[uri] ?? { done: false };
    if (this.state[uri] === undefined) {
      this.state[uri] = state;
    }
    state.done = false;
    const vhdlLinter = new VhdlLinter(url, text, projectParser, settingsGetter, newSource.token);
    state.valid = vhdlLinter.parsedSuccessfully;
    this.emitter.emit(uri);
    if (vhdlLinter.parsedSuccessfully) {
      this.linters[uri] = vhdlLinter;
      await Elaborate.elaborate(vhdlLinter);
      if (newSource.token.isCancellationRequested) {
        throw new ResponseError(LSPErrorCodes.RequestCancelled, 'canceled');
      }
      state.done = true;
      state.wasAlreadyValid = true;
      this.emitter.emit(uri);
    }
    return vhdlLinter;

  }
}