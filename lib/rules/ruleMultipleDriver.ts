import { CodeAction, CodeActionKind, Command, DiagnosticSeverity } from "vscode-languageserver";
import { implementsIHasDeclarations } from "../parser/interfaces";
import { OArchitecture, ObjectBase, OFile, OInstantiation, OProcess, OSignal, OWrite } from "../parser/objects";
import { IRule, RuleBase } from "./rulesBase";


// TODO: multiple-driver rule: verify its functionality and write tests (or remove)
export class RuleMultipleDriver extends RuleBase implements IRule {
  public static readonly ruleName = 'multiple-driver';
  file: OFile;

  private checkMultipleDriver(signal: OSignal) {
    const writes = signal.referenceLinks.filter(token => token instanceof OWrite);
    // check for multiple drivers
    const writeScopes = writes.map(write => {
      // checked scopes are: OArchitecture, OProcess, OInstantiation (only component and entity)
      let scope: ObjectBase | OFile = write.parent;
      while (!(scope instanceof OArchitecture
        || scope instanceof OFile
        || scope instanceof OProcess)) {
        if (scope instanceof OInstantiation && (scope.type === 'component' || scope.type === 'entity')) {
          break;
        }
        scope = scope.parent;
      }
      return { scope, write };
    });
    const filteredScopes = writeScopes.filter((v, i, a) => a.findIndex(x => x.scope === v.scope) === i);

    const ignoreAction = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
      return [
        CodeAction.create(
          `Ignore multiple drivers of ${signal.lexerToken.text}`,
          Command.create(
            `Ignore multiple drivers of ${signal.lexerToken.text}`,
            'vhdl-linter:ignore-line',
            { textDocumentUri, range: signal.lexerToken.range }
          ),
          CodeActionKind.QuickFix
        )
      ];
    });
    if (filteredScopes.length > 1) {
      this.addMessage({
        code: ignoreAction,
        range: signal.lexerToken.range,
        severity: DiagnosticSeverity.Warning,
        message: `'${signal.lexerToken.text}' has multiple drivers (e.g. lines ${filteredScopes.map(s => String(s.write.range.start.line)).join(', ')}).`
      });
      for (const write of writeScopes) {
        this.addMessage({
          code: ignoreAction,
          range: write.write.range,
          severity: DiagnosticSeverity.Warning,
          message: `Driver of multiple driven signal '${signal.lexerToken.text}'.`
        });
      }
    } else if (filteredScopes.length === 1 && writes.length > 1 && !(filteredScopes[0]?.scope instanceof OProcess)) {
      // if multiple writes in the architecture or one instantiation
      this.addMessage({
        code: ignoreAction,
        range: signal.lexerToken.range,
        severity: DiagnosticSeverity.Warning,
        message: `'${signal.lexerToken.text}' has ${writes.length} drivers (lines ${writeScopes.map(s => String(s.write.range.start.line)).join(', ')}).`
      });
      for (const write of writeScopes) {
        this.addMessage({
          code: ignoreAction,
          range: write.write.range,
          severity: DiagnosticSeverity.Warning,
          message: `Driver of multiple driven signal '${signal.lexerToken.text}'.`
        });
      }
    }
  }
  check() {
    for (const obj of this.file.objectList) {
      if (implementsIHasDeclarations(obj)) {
        for (const signal of obj.declarations) {
          if (signal instanceof OSignal === false) {
            continue;
          }
          const references = signal.referenceLinks.slice(0);
          references.push(...signal.aliasReferences.flatMap(alias => alias.referenceLinks));
          if (references.filter(token => token instanceof OWrite).length > 0) {
            this.checkMultipleDriver(signal as OSignal);
          }
        }
      }
    }
  }
}