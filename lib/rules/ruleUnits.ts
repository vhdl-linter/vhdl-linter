import { CodeAction, CodeActionKind, DiagnosticSeverity, TextEdit } from "vscode-languageserver";
import { TokenType } from "../lexer";
import { OFile, OName, OUnit } from "../parser/objects";
import { IRule, RuleBase } from "./rulesBase";

export class RuleUnits extends RuleBase implements IRule {
  public static readonly ruleName = 'unit';
  file: OFile;

  check() {
    for (const obj of this.file.objectList) {
      if (obj instanceof OName && obj.nameToken.getLText() !== 'all' && obj.definitions.some(def => def instanceof OUnit)) {
        // check if token before unit token is whitespace
        const i = this.file.lexerTokens.findIndex(token => token === obj.nameToken);
        if (i > 1 && this.file.lexerTokens[i - 1]!.type === TokenType.decimalLiteral) {
          const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
            return [CodeAction.create(
              `Add space before unit reference`,
              {
                changes: {
                  [textDocumentUri]: [TextEdit.insert(obj.nameToken.range.start, ' ')]
                }
              },
              CodeActionKind.QuickFix)];
          });
          this.addMessage({
            range: obj.nameToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `There should be a space before a unit reference.`,
            code
          });

        }
      }
    }

  }
}