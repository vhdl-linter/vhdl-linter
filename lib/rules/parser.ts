import { RuleBase, IRule } from "./rules-base";
import { OFile } from "../parser/objects";
import { CodeAction, CodeActionKind } from "vscode-languageserver";

export class RParser extends RuleBase implements IRule {
  public name = 'parser';
  file: OFile;

  async check() {
    for (const message of this.file.parserMessages) {
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