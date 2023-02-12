import { EventEmitter } from "stream";
import { CancellationToken, CancellationTokenSource, LSPErrorCodes, ResponseError } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Elaborate } from "./elaborate/elaborate";
import { getDocumentSettings } from "./language-server";
import { normalizeUri } from "./normalize-uri";
import { ProjectParser } from "./project-parser";
import { VhdlLinter } from "./vhdl-linter";

interface ILinterState {
  valid?: boolean;
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
    while (this.state[uri]?.done !== true && (preferOldOverWaiting || this.state[uri]?.valid)) {
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
  async triggerRefresh(textDocument: TextDocument, projectParser: ProjectParser) {
    const uri = normalizeUri(textDocument.uri);
    const oldSource = this.cancellationTokenSources[uri];
    if (oldSource) {
      oldSource.cancel();
    }
    const newSource = new CancellationTokenSource();
    this.cancellationTokenSources[uri] = newSource;
    const url = new URL(uri);
    this.state[uri] = {
      done: false
    };
    const vhdlLinter = new VhdlLinter(url, textDocument.getText(), projectParser, getDocumentSettings, newSource.token);
    this.state[uri]!.valid = vhdlLinter.parsedSuccessfully;
    this.emitter.emit(uri);
    if (vhdlLinter.parsedSuccessfully) {
      this.linters[uri] = vhdlLinter;
      await Elaborate.elaborate(vhdlLinter);
      if (newSource.token.isCancellationRequested) {
        throw new ResponseError(LSPErrorCodes.RequestCancelled, 'canceled');
      }
      this.state[uri]!.done = true;
      this.emitter.emit(uri);
    }
    return vhdlLinter;

  }
}
const cancellationTokenSource = new CancellationTokenSource();