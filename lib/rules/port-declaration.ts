import { RuleBase, IRule } from "./rules-base";
import { DiagnosticSeverity, CodeAction, TextEdit, CodeActionKind } from "vscode-languageserver";
import { OFile } from "../parser/objects";
import { URI } from "vscode-uri";

export class RPortDeclaration extends RuleBase implements IRule {
  public name = 'port-declaration';
  file: OFile;

  async check() {
    for (const entity of this.file.entities) {

      const portSettings = (await this.vhdlLinter.settingsGetter(URI.file(this.vhdlLinter.editorPath).toString())).ports;
      if (portSettings.enablePortStyle) {

        for (const port of entity.ports ?? []) {
          if (port.direction === 'in') {
            if (port.lexerToken.text.match(new RegExp(portSettings.outRegex, 'i'))) {
              const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
                const actions = [];
                const newName = port.lexerToken.text.replace(new RegExp(portSettings.outRegex, 'i'), 'i_');
                actions.push(CodeAction.create(
                  `Replace portname with '${newName}`,
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
                message: `input port '${port.lexerToken}' matches output regex ${portSettings.outRegex}`,
                code
              });
            } else if (port.lexerToken.text.match(new RegExp(portSettings.inRegex, 'i')) === null) {
              const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
                const actions = [];
                const newName = port.lexerToken.text.replace(/^(._|_?)/, 'i_');
                actions.push(CodeAction.create(
                  `Replace portname with '${newName}`,
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
                message: `input port '${port.lexerToken}' should match input regex ${portSettings.inRegex}`,
                code
              });
            }
          } else if (port.direction === 'out') {
            if (port.lexerToken.text.match(new RegExp(portSettings.inRegex, 'i'))) {
              const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
                const actions = [];
                const newName = port.lexerToken.text.replace(/^i_/, 'o_');
                actions.push(CodeAction.create(
                  `Replace portname with '${newName}`,
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
                message: `ouput port '${port.lexerToken}' matches input regex ${portSettings.inRegex}`,
                code
              });
            } else if (port.lexerToken.text.match(new RegExp(portSettings.outRegex, 'i')) === null) {
              const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
                const actions = [];
                const newName = port.lexerToken.text.replace(/^(._|_?)/, 'o_');
                actions.push(CodeAction.create(
                  `Replace portname with '${newName}`,
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
                message: `ouput port '${port.lexerToken}' should match output regex ${portSettings.outRegex}`
              });
            }
          }
        }
      }
    }
  }
}