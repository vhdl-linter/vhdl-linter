import { platform } from "process";
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
  private projectParserDebounce: Record<string, NodeJS.Timeout> = {};
  constructor() {
    this.emitterGlobal.on('changed', (uri: string, projectParser: ProjectParser) => {
      if (this.state[uri]?.done && this.state[uri]?.valid) {
        clearTimeout(this.projectParserDebounce[uri]);
        this.projectParserDebounce[uri] = setTimeout(() => {
          const vhdlLinter = this.linters[uri]!;
          const cachedFile = platform === 'win32'
            ? projectParser.cachedFiles.find(cachedFile => cachedFile.uri.toString().toLowerCase() === uri.toLowerCase())
            : projectParser.cachedFiles.find(cachedFile => cachedFile.uri.toString() === uri);
          cachedFile?.replaceLinter(vhdlLinter);
          projectParser.flattenProject();
          projectParser.events.emit('change', 'change', uri);
        }, 100);
      }
    });
  }
  // We do not actually care for the linter were the parsing failed.
  // So this will always point to working linter
  // The state has to be evaluated to see if it is current
  private linters: Record<string, VhdlLinter> = {};

  state: Record<string, ILinterState> = {};
  private emitter = new EventEmitter();
  private emitterGlobal = new EventEmitter();

  async getLinter(uri: string, token?: CancellationToken, preferOldOverWaiting = true) {
    uri = normalizeUri(uri);
    while (this.state[uri]?.done !== true || (preferOldOverWaiting && this.state[uri]?.wasAlreadyValid !== true) || (preferOldOverWaiting === false && this.state[uri]?.valid !== true)) {
      await new Promise(resolve => this.emitter.once(uri, resolve));
      if (token?.isCancellationRequested) {
        throw new ResponseError(LSPErrorCodes.RequestCancelled, 'canceled');
      }
    }
    const linter = this.linters[uri];
    if (!linter) {
      throw new Error('Should have linter');
    }
    return linter;
  }
  cancellationTokenSources: Record<string, CancellationTokenSource> = {};
  async triggerRefresh(uri: string, text: string, projectParser: ProjectParser, settingsGetter: SettingsGetter, fromProjectParser = false) {
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
      if (!fromProjectParser) {
        this.emitterGlobal.emit('changed', uri, projectParser);
      }
    }
    return vhdlLinter;
  }
}