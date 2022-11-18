import {
  CodeAction, CodeActionKind, CodeLens, Command, Diagnostic, DiagnosticSeverity, Position, Range, TextEdit
} from 'vscode-languageserver';
import { Elaborator } from './elaborator';
import {
  implementsIReferencable, OAssociation, OFile, OI, OIRange, ParserError} from './parser/objects';
import { Parser } from './parser/parser';
import { ProjectParser } from './project-parser';
import { rules } from './rules/rule-index';
import { CancelationObject, CancelationError } from './server-objects';
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
export type SettingsGetter = (resource: string) => Promise<ISettings> | ISettings;
export type diagnosticCodeActionCallback = (textDocumentUri: string) => CodeAction[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type commandCallback = (textDocumentUri: string, ...args: any[]) => TextEdit[];
export class VhdlLinter {
  messages: Diagnostic[] = [];
  file: OFile;
  parser: Parser;
  parsedSuccessfully = false;
  constructor(public editorPath: string, public text: string, public projectParser: ProjectParser,
    public settingsGetter: SettingsGetter,
    public onlyEntity: boolean = false, public cancelationObject: CancelationObject = { canceled: false }) {
    try {
      this.parser = new Parser(text, this.editorPath, onlyEntity, cancelationObject);
      this.file = this.parser.parse();
      this.parsedSuccessfully = true;
    } catch (e) {
      if (e instanceof ParserError) {
        let code;
        if (e.solution) {
          code = this.addCodeActionCallback((textDocumentUri: string) => {
            const actions = [];
            actions.push(CodeAction.create(
              e.solution.message,
              {
                changes: {
                  [textDocumentUri]: e.solution.edits
                }
              },
              CodeActionKind.QuickFix));
            return actions;
          });
        }

        this.messages.push({
          range: e.range,
          severity: DiagnosticSeverity.Error,
          message: e.message,
          code
        });
        this.file = new OFile(this.text, this.editorPath, this.text);
      } else {
        this.messages.push({
          range: Range.create(Position.create(0, 0), Position.create(10, 10)),
          message: `Javascript error while parsing '${e.message}'`
        });
        console.error(e);
        this.file = new OFile(this.text, this.editorPath, this.text);

      }
    }
    //     console.log(`done parsing: ${editorPath}`);

  }

  diagnosticCodeActionRegistry: diagnosticCodeActionCallback[] = [];
  addCodeActionCallback(handler: diagnosticCodeActionCallback): number {
    return this.diagnosticCodeActionRegistry.push(handler) - 1;
  }
  commandCallbackRegistry: commandCallback[] = [];
  addCommandCallback(title: string, textDocumentUri: string, handler: commandCallback): Command {
    const counter = this.commandCallbackRegistry.push(handler) - 1;
    return {
      title,
      command: 'vhdl-linter:lsp-command',
      arguments: [textDocumentUri, counter]
    };
  }

  addMessage(diagnostic: OIDiagnostic) {
    const newCode = this.addCodeActionCallback((textDocumentUri: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actions = [] as any[];
      // [textDocumentUri]: [TextEdit.replace(Range.create(write.range.start, write.range.end), bestMatch.bestMatch.target)]
      actions.push(CodeAction.create(
        'Ignore messages on this line.',
        {
          changes: {
            [textDocumentUri]: [
              TextEdit.insert(Position.create(diagnostic.range.end.line, 1000), ' --vhdl-linter-disable-this-line')]
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
    this.messages.push(diagnostic);
  }


  async handleCanceled() {
    await new Promise(resolve => setImmediate(resolve));
    if (this.cancelationObject.canceled) {
      console.log('canceled');
      throw new CancelationError();
    }
  }





  // When the definition of an association can not be found avoid errors because actuals can not be cleanly mapped then
  async removeBrokenActuals() {
    for (const association of this.file.objectList.filter(object => object instanceof OAssociation) as OAssociation[]) {
      if (association.actualIfInput.length > 0
        && (association.actualIfOutput[0].length > 0 || association.actualIfOutput[1].length > 0)
        && (association.actualIfInoutput[0].length > 0 || association.actualIfInoutput[1].length > 0)) {
        for (const mapping of association.actualIfOutput.flat()) {
          const index = this.file.objectList.indexOf(mapping);
          this.file.objectList.splice(index, 1);
          for (const mentionable of this.file.objectList) {
            if (implementsIReferencable(mentionable)) {
              for (const [index, mention] of mentionable.references.entries()) {
                if (mention === mapping) {
                  mentionable.references.splice(index, 1);
                }
              }
            }
          }
        }
        association.actualIfOutput = [[], []];
        for (const mapping of association.actualIfInoutput.flat()) {
          const index = this.file.objectList.indexOf(mapping);
          this.file.objectList.splice(index, 1);
          for (const mentionable of this.file.objectList) {
            if (implementsIReferencable(mentionable)) {
              for (const [index, mention] of mentionable.references.entries()) {
                if (mention === mapping) {
                  mentionable.references.splice(index, 1);
                }
              }
            }
          }
        }
        association.actualIfInoutput = [[], []];
      }
    }
  }

  async checkAll(profiling = false) {
    if (profiling) {
      console.profile();
    }
    let start;
    let i = 0;
    if (this.file) {
      start = Date.now();
      try {
        await Elaborator.elaborate(this);
        if (profiling) {
          console.log(`check ${i++}: ${Date.now() - start}ms`);
          start = Date.now();
        }
        await this.removeBrokenActuals();
        if (profiling) {
          console.log(`check ${i++}: ${Date.now() - start}ms`);
          start = Date.now();
        }
        for (const checkerClass of rules) {
          const checker = new checkerClass(this);
          await checker.check();
          if (profiling) {
            console.log(`check ${checker.name}: ${Date.now() - start}ms`);
            start = Date.now();
          }
          await this.handleCanceled();
        }
      } catch (err) {
        if (err instanceof ParserError) {
          this.messages.push(Diagnostic.create(err.range, `Error while parsing: '${err.message}'`));

        } else {
          this.messages.push(Diagnostic.create(Range.create(Position.create(0, 0), Position.create(10, 100)), `Error while checking: '${err.message}'\n${err.stack}`));

        }
      }

      // this.parser.debugObject(this.tree);
    }
    if (profiling) {
      console.profileEnd();
    }
    return this.messages;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getCodeLens(textDocumentUri: string): CodeLens[] {
    const codeLenses: CodeLens[] = [];
    return codeLenses;

  }




  getIFromPosition(p: Position): number {
    const text = this.text.split('\n').slice(0, p.line);
    const i = text.join('\n').length + p.character;
    return i;
  }
}
