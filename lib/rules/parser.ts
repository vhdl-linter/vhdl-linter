import { RuleBase, IRule } from "./rules-base";
import { OFile } from "../parser/objects";
import { CodeAction, CodeActionKind } from "vscode-languageserver";
import { OIDiagnosticWithSolution } from "../parser/interfaces";

export class RParser extends RuleBase implements IRule {
  public name = 'parser';
  file: OFile;

  async check() {
    // Uniquify the messages (for multiplied messages for different exp parser runs in association list)
    const map = new Map<string, OIDiagnosticWithSolution>();
    for (const message of this.file.parserMessages) {
      map.set(`${message.range.start.i}-${message.range.end.i}-${message.solution?.message}-${message.message}`, message);
    }
    for (const message of map.values()) {
      let code;

      if (message.solution) {
        const solution = message.solution;
        code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
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
      this.addMessage({
        range: message.range,
        severity: message.severity,
        message: message.message,
        code
      });
    }
  }
}