import { RuleBase, IRule } from "./rules-base";
import { CodeAction, CodeActionKind, Command, DiagnosticSeverity } from "vscode-languageserver";
import { OArchitecture, ObjectBase, OConstant, OFile, OInstantiation, OPort, OProcess, ORead, OSignal, OSubprogram, OType, OVariable, OWrite } from "../parser/objects";
import { getDocumentSettings } from "../language-server";
import { URI } from "vscode-uri";

export class RUnused extends RuleBase implements IRule {
  public name = 'unused';
  file: OFile;
  private checkUnusedPorts(ports: OPort[]) {
    for (const port of ports) {
      if ((port.direction === 'in' || port.direction === 'inout') && port.references.filter(token => token instanceof ORead).length === 0) {
        this.addMessage({
          range: port.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not reading input port '${port.lexerToken}'`
        });
      }
      const writes = port.references.filter(token => token instanceof OWrite);
      if ((port.direction === 'out' || port.direction === 'inout') && writes.length === 0) {
        this.addMessage({
          range: port.range,
          severity: DiagnosticSeverity.Warning,
          message: `Not writing output port '${port.lexerToken}'`
        });
      }
    }
  }
  async check() {
    for (const architecture of this.file.architectures) {
      const entity = architecture.correspondingEntity;
      const settings = (await getDocumentSettings(URI.file(this.vhdlLinter.editorPath).toString()));
      if (!architecture) {
        return;
      }

      const unusedSignalRegex = new RegExp(settings.style.unusedSignalRegex);
      if (entity) {
        this.checkUnusedPorts(entity.ports);
        for (const generic of entity.generics) {
          if (unusedSignalRegex.exec(generic.lexerToken.text) === null && generic.references.filter(token => token instanceof ORead).length === 0) {
            this.addMessage({
              range: generic.range,
              severity: DiagnosticSeverity.Warning,
              message: `Not reading generic '${generic.lexerToken}'`
            });
          }
          for (const write of generic.references.filter(token => token instanceof OWrite)) {
            this.addMessage({
              range: write.range,
              severity: DiagnosticSeverity.Error,
              message: `Generic ${generic.lexerToken} cannot be written`
            });
          }
        }
      }
      for (const type of architecture.types) {
        if (unusedSignalRegex.exec(type.lexerToken.text) === null && type.references.length === 0) {
          this.addMessage({
            range: type.lexerToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `Not using type ${type.lexerToken.text}`
          });
        }
      }
      for (const component of architecture.components) {
        if (unusedSignalRegex.exec(component.lexerToken.text) === null && component.references.length === 0) {
          this.addMessage({
            range: component.lexerToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `Not using component ${component.lexerToken.text}`
          });
        }
      }
      for (const signal of architecture.rootFile.objectList.filter(object => object instanceof OSignal) as OSignal[]) {
        if (unusedSignalRegex.exec(signal.lexerToken.text) === null && signal.references.filter(token => token instanceof ORead).length === 0) {
          this.addMessage({
            range: signal.lexerToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `Not reading signal '${signal.lexerToken}'`
          });
        }
        const writes = signal.references.filter(token => token instanceof OWrite);
        if (unusedSignalRegex.exec(signal.lexerToken.text) === null && writes.length === 0) {
          this.addMessage({
            range: signal.lexerToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `Not writing signal '${signal.lexerToken}'`
          });
        } else if (settings.rules.warnMultipleDriver && writes.length > 1) {
          // TODO: remove this (buggy) functionality?
          // check for multiple drivers
          const writeScopes = writes.map(write => {
            // checked scopes are: OArchitecture, OProcess, OInstatiation (only component and entity)
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
          if (filteredScopes.length > 1 && this.checkMagicComments(signal.lexerToken.range)) {
            this.addMessage({
              code: ignoreAction,
              range: signal.lexerToken.range,
              severity: DiagnosticSeverity.Warning,
              message: `'${signal.lexerToken}' has multiple drivers (e.g. lines ${filteredScopes.map(s => `${s.write.range.start.line}`).join(', ')}).`
            });
            for (const write of writeScopes) {
              this.addMessage({
                code: ignoreAction,
                range: write.write.range,
                severity: DiagnosticSeverity.Warning,
                message: `Driver of multiple driven signal '${signal.lexerToken}'.`
              });
            }
          } else if (filteredScopes.length === 1 && writes.length > 1 && !(filteredScopes[0].scope instanceof OProcess) && this.checkMagicComments(signal.lexerToken.range)) {
            // if multiple writes in the architecture or one instantiation
            this.addMessage({
              code: ignoreAction,
              range: signal.lexerToken.range,
              severity: DiagnosticSeverity.Warning,
              message: `'${signal.lexerToken}' has ${writes.length} drivers (lines ${writeScopes.map(s => `${s.write.range.start.line}`).join(', ')}).`
            });
            for (const write of writeScopes) {
              this.addMessage({
                code: ignoreAction,
                range: write.write.range,
                severity: DiagnosticSeverity.Warning,
                message: `Driver of multiple driven signal '${signal.lexerToken}'.`
              });
            }
          }
        }
      }
      for (const variable of architecture.rootFile.objectList.filter(object => object instanceof OVariable) as OVariable[]) {
        if (unusedSignalRegex.exec(variable.lexerToken.text) === null && variable.references.filter(token => token instanceof ORead).length === 0) {
          this.addMessage({
            range: variable.lexerToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `Not reading variable '${variable.lexerToken}'`
          });
        }
        const writes = variable.references.filter(token => token instanceof OWrite);
        if (unusedSignalRegex.exec(variable.lexerToken.text) === null && writes.length === 0) {
          if (variable.type[0]?.definitions?.[0] instanceof OType) {
            // This is protected type. Assume protected type has side-effect and does not net writting to.
          } else {
            this.addMessage({
              range: variable.lexerToken.range,
              severity: DiagnosticSeverity.Warning,
              message: `Not writing variable '${variable.lexerToken}'`
            });

          }
        }
      }
      for (const constant of architecture.rootFile.objectList.filter(object => object instanceof OConstant) as OConstant[]) {
        if (unusedSignalRegex.exec(constant.lexerToken.text) === null && constant.references.filter(token => token instanceof ORead).length === 0) {
          this.addMessage({
            range: constant.lexerToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `Not reading constant '${constant.lexerToken}'`
          });
        }
        for (const write of constant.references.filter(token => token instanceof OWrite)) {
          this.addMessage({
            range: write.range,
            severity: DiagnosticSeverity.Error,
            message: `Constant ${constant.lexerToken} cannot be written`
          });
        }
      }
      for (const subprogram of architecture.rootFile.objectList.filter(object => object instanceof OSubprogram) as OSubprogram[]) {
        this.checkUnusedPorts(subprogram.ports);
      }
    }
  }
}