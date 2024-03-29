import { platform } from "process";
import { EventEmitter } from "stream";
import { CancellationToken, CancellationTokenSource, LSPErrorCodes, ResponseError, _Connection } from "vscode-languageserver";
import { Elaborate } from "./elaborate/elaborate";
import { normalizeUri } from "./normalizeUri";
import { FileCacheVhdl, ProjectParser } from "./projectParser";
import { VhdlLinter } from "./vhdlLinter";
import { URL } from 'url';

interface ILinterState {
  wasAlreadyValid?: boolean; // Was already once valid (=the linters object has a valid linter)
  valid?: boolean; // The file is currently valid in is last parsed/elaborated version
  done: boolean; // If a linter is marked done it is currently not parsing/elaborating
  linter?: VhdlLinter;
  version: number
}
export class LinterManager {
  constructor(public connection?: _Connection) { }
  private projectParserDebounce: Record<string, NodeJS.Timeout> = {};
  // We do not actually care for the linter where the parsing failed.
  // So this will always point to working linter
  // The state has to be evaluated to see if it is current

  state: Record<string, ILinterState> = {};
  // The emitter is used for synchronization of the asynchronous functions
  // On every state change the emitter for a uri gets triggered.
  // To wait on a specific state the getLinter function checks for state and then waits on emitter in a loop
  private emitter = new EventEmitter();
  async waitOnStateChange(uri: string, token?: CancellationToken) {
    await new Promise((resolve, reject) => {
      token?.onCancellationRequested(() => {
        this.emitter.off(uri, resolve);
        reject(new ResponseError(LSPErrorCodes.RequestCancelled, 'canceled'));
      });
      this.emitter.once(uri, resolve);
    });
  }
  async getLinter(uri: string, token?: CancellationToken, preferOldOverWaiting = true) {
    uri = normalizeUri(uri);

    if (preferOldOverWaiting) {
      // language feature prefers fast result -> wait on wasAlreadyValid
      // This parameter gets set the first time a file gets valid and will not become false again
      while (this.state[uri]?.wasAlreadyValid !== true) {
        await this.waitOnStateChange(uri, token);
      }

    } else {
      // If language feature prefers the most current result -> wait on the current parsing run being done and resulting in a valid result
      while (this.state[uri]?.done !== true || this.state[uri]?.valid !== true) {
        await this.waitOnStateChange(uri, token);
      }
    }
    const linter = this.state[uri]!.linter;
    if (!linter) {
      throw new Error('Should have linter');
    }
    return linter;
  }
  cancellationTokenSources: Record<string, CancellationTokenSource> = {};
  async triggerRefresh(uri: string, text: string, projectParser: ProjectParser, version: number, fromProjectParser = false): Promise<VhdlLinter> {
    uri = normalizeUri(uri);
    // Cancel previous running linter of this uri
    const oldSource = this.cancellationTokenSources[uri];
    if (oldSource) {
      oldSource.cancel();
    }
    const newSource = new CancellationTokenSource();
    this.cancellationTokenSources[uri] = newSource;
    const url = new URL(uri);
    // Initialize state for linter
    const state = this.state[uri] ?? { done: false, version };
    if (this.state[uri] === undefined) {
      this.state[uri] = state;
    }
    // Check that we do not have some janky race condition and are actually running on the newest file
    if (state.version > version) {
      console.log('linter manager dropping old version');
      return state.linter!;
    }
    state.version = version;
    // Mark File as currently being worked on
    state.done = false;
    const settings = await projectParser.getDocumentSettings(url);
    const vhdlLinter = new VhdlLinter(url, text, projectParser, settings, newSource.token, this.connection);
    if (vhdlLinter.parsedSuccessfully === false) {
      // If parsed unsuccessfully mark this file as invalid.
      // (But old linter is kept for language-features that do not care for having the newest data)
      if (state.version > version) {
        console.log('linter manager: dropping old version');
        return state.linter!;
      }
      state.valid = false;
    } else {
      for (const cachedFile of projectParser.cachedFiles) {
        if (cachedFile instanceof FileCacheVhdl) {
          Elaborate.clear(cachedFile.linter);
        }
      }
      // Parser success run elaboration
      state.linter = vhdlLinter;
      await Elaborate.elaborate(vhdlLinter);
      if (newSource.token.isCancellationRequested) {
        throw new ResponseError(LSPErrorCodes.RequestCancelled, 'canceled');
      }
      if (state.version > version) {
        console.log('linter manager: dropping old version');
        return state.linter;
      }
      state.done = true;
      state.wasAlreadyValid = true;
      state.valid = vhdlLinter.parsedSuccessfully;
      this.emitter.emit(uri);
      if (!fromProjectParser) {
        this.handleProjectParser(uri, projectParser);
      }
    }
    return vhdlLinter;
  }
  // This handles giving the modified files to project Parser. So for files that have a modified buffer projectParser uses the current version.
  handleProjectParser(uri: string, projectParser: ProjectParser) {
    const state = this.state[uri];
    if (state?.done && state?.valid) {
      clearTimeout(this.projectParserDebounce[uri]);
      this.projectParserDebounce[uri] = setTimeout(() => {
        const vhdlLinter = state.linter!;
        const cachedFile = platform === 'win32'
          ? projectParser.cachedFiles.find(cachedFile => cachedFile.uri.toString().toLowerCase() === uri.toLowerCase())
          : projectParser.cachedFiles.find(cachedFile => cachedFile.uri.toString() === uri);
        if (cachedFile instanceof FileCacheVhdl) {
          cachedFile.replaceLinter(vhdlLinter);
        }
        projectParser.flattenProject();
      }, 30);
    }
  }
}