import {
  CancellationToken,
  CodeAction, CodeActionKind, Diagnostic, DiagnosticSeverity, LSPErrorCodes, Position, Range, ResponseError, TextEdit, _Connection
} from 'vscode-languageserver';
import { Elaborate } from './elaborate/elaborate';
import { OLexerToken } from './lexer';
import { FileParser } from './parser/fileParser';
import {
  OFile, OI, OIRange, ParserError
} from './parser/objects';
import { ProjectParser } from './projectParser';
import { rules } from './rules/ruleIndex';
import { ISettings } from './settingsGenerated';
import { URL } from 'url';

export interface IAddSignalCommandArguments {
  textDocumentUri: string;
  signalName: string;
  position: OI;
}
export interface OIDiagnostic extends Diagnostic {
  range: OIRange;
}
export interface OIDiagnosticWithSolution extends OIDiagnostic {
  solution?: { message: string, edits: TextEdit[] };
}

export interface IIgnoreLineCommandArguments {
  textDocumentUri: string;
  range: Range;
}
type diagnosticCodeActionCallback = (textDocumentUri: string, cancellationToken: CancellationToken) => Promise<CodeAction[]> | CodeAction[];
export class VhdlLinter {
  messages: OIDiagnostic[] = [];
  file: OFile;
  parser?: FileParser;
  parsedSuccessfully = false;
  elaborated = false;
  // Store data for casing style actions (For the do all in file button)
  casingStyleActions: { token: OLexerToken, newName: string }[] = [];
  constructor(public uri: URL, public text: string, public projectParser: ProjectParser,
    public settings: ISettings,
    public token?: CancellationToken, public connection?: _Connection) {
    try {
      this.parser = new FileParser(text, this.uri, settings);
      this.file = this.parser.parse();
      this.parsedSuccessfully = true;
      this.file.parserMessages = this.parser.state.messages;
    } catch (e) {
      if (e instanceof ParserError) {
        const solution = e.solution;
        let code;
        if (solution) {
          code = this.addCodeActionCallback((textDocumentUri: string) => {
            return [CodeAction.create(
              solution.message,
              {
                changes: {
                  [textDocumentUri]: solution.edits
                }
              },
              CodeActionKind.QuickFix)];
          });
        }
        // Include the parser messages that did not result in fatal.
        // Normally this is done in RParser. (This rule can not be called here as it needs settings which need to be fetched async and this is constructor)
        if (this.parser !== undefined) {
          this.messages.push(...this.parser.state.messages);
        }
        this.messages.push({
          range: e.range,
          severity: DiagnosticSeverity.Error,
          message: e.message,
          code
        });
        this.file = new OFile(this.text, this.uri, this.text, this.parser?.lexerTokens ?? []);
      } else {
        let message = 'Unknown error while parsing';
        if (e instanceof Error) {
          message = `Javascript error while parsing '${e.message}' ${e.stack ?? ''}`;
        }
        this.messages.push({
          range: new OIRange(this.file, 0, 50),
          message
        });
        console.error(e);
        this.file = new OFile(this.text, this.uri, this.text, []);

      }
    }
    //     console.log(`done parsing: ${editorPath}`);

  }

  diagnosticCodeActionRegistry: diagnosticCodeActionCallback[] = [];
  diagnosticCodeActionResolveRegistry: Record<number, diagnosticCodeActionCallback> = {};

  addCodeActionCallback(handler: diagnosticCodeActionCallback, resolveHandler?: diagnosticCodeActionCallback): number {
    const index = this.diagnosticCodeActionRegistry.push(handler) - 1;
    if (resolveHandler) {
      this.diagnosticCodeActionResolveRegistry[index] = resolveHandler;
    }
    return index;
  }

  addMessage(diagnostic: OIDiagnostic, name: string): void {
    if (this.checkMagicComments(diagnostic.range, name)) {
      const newCode = this.addCodeActionCallback((textDocumentUri: string) => {
        const actions: CodeAction[] = [];
        const existingComment = this.file.magicComments.find(mc => mc.range.start.line == diagnostic.range.end.line && mc.range.end.line == diagnostic.range.end.line);
        actions.push(CodeAction.create(
          `Ignore ${name} on this line.`,
          {
            changes: {
              [textDocumentUri]: [
                existingComment === undefined ?
                  TextEdit.insert(Position.create(diagnostic.range.end.line, 1000), ` -- vhdl-linter-disable-line ${name}`)
                  : TextEdit.insert(existingComment.range.end, ` ${name}`)
              ]
            }
          },
          CodeActionKind.QuickFix));
        const existingCommentFile = this.file.magicComments.find(mc => mc.range.start.line == 0 && mc.range.end.i == this.text.length - 1);

        actions.push(CodeAction.create(
          `Ignore ${name} for this file.`,
          {
            changes: {
              [textDocumentUri]: [
                existingCommentFile === undefined ?
                  TextEdit.insert(Position.create(0, 0), `-- vhdl-linter-disable ${name}\n`)
                  : TextEdit.insert(Position.create(existingCommentFile.range.start.line, 1000), ` ${name}`)
              ]

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
      if (magicComment.rule !== undefined) {
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
      if (this.elaborated === false) {
        await Elaborate.elaborate(this);
      }
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

      for (const checkerClass of rules) {
        if ((this.settings.rules as Record<string, boolean>)[checkerClass.ruleName]) {
          const checker = new checkerClass(this, this.settings, this.connection);
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
        this.messages.push({ range: err.range, message: `Error while parsing: '${err.message}'` });
      } else {
        this.messages.push({ range: new OIRange(this.file, 0, 50), message: `Error while checking: '${(err as Error)?.message}'\n${(err as Error)?.stack ?? ''}` });
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
