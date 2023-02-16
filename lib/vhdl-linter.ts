import {
  CancellationToken,
  CodeAction, CodeActionKind, Diagnostic, DiagnosticSeverity, LSPErrorCodes, Position, Range, ResponseError, TextEdit
} from 'vscode-languageserver';
import { Elaborate } from './elaborate/elaborate';
import { FileParser } from './parser/file-parser';
import {
  OFile, OI, OIRange, ParserError
} from './parser/objects';
import { ProjectParser } from './project-parser';
import { rules } from './rules/rule-index';
import { ISettings } from './settings';

export interface IAddSignalCommandArguments {
  textDocumentUri: string;
  signalName: string;
  position: OI;
}
export interface OIDiagnostic extends Diagnostic {
  range: OIRange;
}
export interface IIgnoreLineCommandArguments {
  textDocumentUri: string;
  range: Range;
}
export type SettingsGetter = (resource: URL) => Promise<ISettings> | ISettings;
type diagnosticCodeActionCallback = (textDocumentUri: string) => CodeAction[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class VhdlLinter {
  messages: Diagnostic[] = [];
  file: OFile;
  parser: FileParser;
  parsedSuccessfully = false;
  constructor(public uri: URL, public text: string, public projectParser: ProjectParser,
    public settingsGetter: SettingsGetter,
    public token?: CancellationToken) {
    try {
      this.parser = new FileParser(text, this.uri);
      this.file = this.parser.parse();
      this.parsedSuccessfully = true;
      this.file.parserMessages = this.parser.state.messages;
    } catch (e) {
      if (e instanceof ParserError) {
        const solution = e.solution;
        let code;
        if (solution) {
          code = this.addCodeActionCallback((textDocumentUri: string) => {
            const actions = [];
            actions.push(CodeAction.create(
              solution.message,
              {
                changes: {
                  [textDocumentUri]: solution.edits
                }
              },
              CodeActionKind.QuickFix));
            return actions;
          });
        }
        // Include the parser messages that did not result in fatal.
        // Normally this is done in RParser. (This rule can not be called here as it needs settings which need to be fetched async and this is constructor)
        this.messages.push(...this.parser.state.messages);
        this.messages.push({
          range: e.range,
          severity: DiagnosticSeverity.Error,
          message: e.message,
          code
        });
        this.file = new OFile(this.text, this.uri, this.text, this.parser.lexerTokens);
      } else {
        let message = 'Unknown error while parsing';
        if (e instanceof Error) {
          message = `Javascript error while parsing '${e.message}' ${e.stack ?? ''}`;
        }
        this.messages.push({
          range: Range.create(Position.create(0, 0), Position.create(10, 10)),
          message
        });
        console.error(e);
        this.file = new OFile(this.text, this.uri, this.text, []);

      }
    }
    //     console.log(`done parsing: ${editorPath}`);

  }

  diagnosticCodeActionRegistry: diagnosticCodeActionCallback[] = [];
  addCodeActionCallback(handler: diagnosticCodeActionCallback): number {
    return this.diagnosticCodeActionRegistry.push(handler) - 1;
  }

  addMessage(diagnostic: OIDiagnostic, name: string): void {
    if (this.checkMagicComments(diagnostic.range, name)) {
      const newCode = this.addCodeActionCallback((textDocumentUri: string) => {
        const actions: CodeAction[] = [];
        actions.push(CodeAction.create(
          `Ignore ${name} on this line.`,
          {
            changes: {
              [textDocumentUri]: [
                TextEdit.insert(Position.create(diagnostic.range.end.line, 1000), ` -- vhdl-linter-disable-line ${name}`)]
            }
          },
          CodeActionKind.QuickFix));
        actions.push(CodeAction.create(
          `Ignore ${name} for this file.`,
          {
            changes: {
              [textDocumentUri]: [
                TextEdit.insert(Position.create(0, 0), `-- vhdl-linter-disable ${name}\n`)]
            }
          },
          CodeActionKind.QuickFix));
        return actions;
      });
      const codes = [];
      if (typeof diagnostic.code !== 'undefined') {
        codes.push(diagnostic.code);
      }
      codes.push(newCode);
      diagnostic.code = codes.join(';');
      diagnostic.message = diagnostic.message + ` (${name})`;
      this.messages.push(diagnostic);
    }
  }

  private checkMagicComments(range: OIRange, name: string) {
    const matchingMagiComments = this.file.magicComments.filter(magicComment => {
      if (range.start.i < magicComment.range.start.i) {
        return false;
      }
      if (range.end.i > magicComment.range.end.i) {
        return false;
      }
      return true;
    }).filter(magicComment => {
      if (magicComment.rule) {
        return name === magicComment.rule;
      }
      return true;
    });
    return matchingMagiComments.length === 0;


  }



  async handleCanceled() {
    await new Promise(resolve => setImmediate(resolve));
    if (this.token?.isCancellationRequested) {

      throw new ResponseError(LSPErrorCodes.RequestCancelled, 'canceled');
    }
  }
  async checkAll(profiling = false) {
    if (this.parsedSuccessfully === false) {
      return this.messages;
    }
    if (profiling) {
      console.profile();
    }
    let start;
    let i = 0;
    start = Date.now();
    try {
      await Elaborate.elaborate(this);
      if (profiling) {
        console.log(`check ${i++}: ${Date.now() - start}ms`);
        start = Date.now();
      }
      // await this.removeBrokenActuals();
      if (profiling) {
        console.log(`check ${i++}: ${Date.now() - start}ms`);
        start = Date.now();
      }
      await this.handleCanceled();

      const settings = await this.settingsGetter(this.uri);
      for (const checkerClass of rules) {
        if ((settings.rules as Record<string, boolean>)[checkerClass.ruleName]) {
          const checker = new checkerClass(this, settings);
          checker.check();
          if (profiling) {
            console.log(`check ${checkerClass.ruleName}: ${Date.now() - start}ms`);
            start = Date.now();
          }
        }
        await this.handleCanceled();
      }
    } catch (err) {
      if ((err instanceof ResponseError && err.code === LSPErrorCodes.RequestCancelled)) {
        throw err;
      } else if (err instanceof ParserError) {
        this.messages.push(Diagnostic.create(err.range, `Error while parsing: '${err.message}'`));
      } else {
        this.messages.push(Diagnostic.create(Range.create(Position.create(0, 0), Position.create(10, 100)), `Error while checking: '${err.message}'\n${err.stack ?? ''}`));
      }
    }

    if (profiling) {
      console.profileEnd();
    }
    return this.messages;
  }

  getIFromPosition(p: Position): number {
    const text = this.text.split('\n').slice(0, p.line);
    const i = text.join('\n').length + p.character;
    return i;
  }
}
