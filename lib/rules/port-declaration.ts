import { CodeAction, CodeActionKind, DiagnosticSeverity, TextEdit } from "vscode-languageserver";
import { OFile } from "../parser/objects";
import { IRule, RuleBase } from "./rules-base";

export class RPortDeclaration extends RuleBase implements IRule {
  public static readonly ruleName = 'port-declaration';
  file: OFile;

  check() {
    for (const entity of this.file.entities) {

      const portSettings = this.settings.ports;

      for (const port of entity.ports) {
        if (port.direction === 'in') {
          if (port.lexerToken.text.match(new RegExp(portSettings.outRegex, 'i'))) {
            const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
              const actions = [];
              const newName = port.lexerToken.text.replace(new RegExp(portSettings.outRegex, 'i'), 'i_');
              actions.push(CodeAction.create(
                `Replace port name with '${newName}`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(port.lexerToken.range, newName)]
                  }
                },
                CodeActionKind.QuickFix));
              actions.push(CodeAction.create(
                `Change port name.`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(port.directionRange, 'out')]
                  }
                },
                CodeActionKind.QuickFix));
              return actions;
            });
            this.addMessage({
              range: port.range,
              severity: DiagnosticSeverity.Error,
              message: `input port '${port.lexerToken.text}' matches output regex ${portSettings.outRegex}`,
              code
            });
          } else if (port.lexerToken.text.match(new RegExp(portSettings.inRegex, 'i')) === null) {
            const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
              const actions = [];
              const newName = port.lexerToken.text.replace(/^(._|_?)/, 'i_');
              actions.push(CodeAction.create(
                `Replace port name with '${newName}`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(port.lexerToken.range, newName)]
                  }
                },
                CodeActionKind.QuickFix));
              return actions;
            });
            this.addMessage({
              range: port.range,
              severity: DiagnosticSeverity.Information,
              message: `input port '${port.lexerToken.text}' should match input regex ${portSettings.inRegex}`,
              code
            });
          }
        } else if (port.direction === 'out') {
          if (port.lexerToken.text.match(new RegExp(portSettings.inRegex, 'i'))) {
            const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
              const actions = [];
              const newName = port.lexerToken.text.replace(/^i_/, 'o_');
              actions.push(CodeAction.create(
                `Replace port name with '${newName}`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(port.lexerToken.range, newName)]
                  }
                },
                CodeActionKind.QuickFix));
              actions.push(CodeAction.create(
                `Change port name.`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(port.directionRange, 'in')]
                  }
                },
                CodeActionKind.QuickFix));
              return actions;
            });
            this.addMessage({
              range: port.range,
              severity: DiagnosticSeverity.Error,
              message: `output port '${port.lexerToken.text}' matches input regex ${portSettings.inRegex}`,
              code
            });
          } else if (port.lexerToken.text.match(new RegExp(portSettings.outRegex, 'i')) === null) {
            const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
              const actions = [];
              const newName = port.lexerToken.text.replace(/^(._|_?)/, 'o_');
              actions.push(CodeAction.create(
                `Replace port name with '${newName}`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(port.lexerToken.range, newName)]
                  }
                },
                CodeActionKind.QuickFix));
              return actions;
            });
            this.addMessage({
              code,
              range: port.lexerToken.range,
              severity: DiagnosticSeverity.Information,
              message: `output port '${port.lexerToken.text}' should match output regex ${portSettings.outRegex}`
            });
          }
        }
      }
    }
  }
}