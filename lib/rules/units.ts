import { CodeAction, CodeActionKind, DiagnosticSeverity, TextEdit } from "vscode-languageserver";
import { OFile, OReference, OUnit } from "../parser/objects";
import { IRule, RuleBase } from "./rules-base";

export class RUnits extends RuleBase implements IRule {
  public name = 'unit';
  file: OFile;

  check() {
    if (!this.settings.style.warnSpaceBeforeUnit) {
      return;
    }
    for (const obj of this.file.objectList) {
      if (obj instanceof OReference && obj.definitions.some(def => def instanceof OUnit)) {
        // check if token before unit token is whitespace
        const i = this.file.lexerTokens.findIndex(token => token === obj.referenceToken);
        if (i > 1 && !this.file.lexerTokens[i - 1]!.isWhitespace()) {
          const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
            return [CodeAction.create(
              `Add space before unit reference`,
              {
                changes: {
                  [textDocumentUri]: [TextEdit.insert(obj.referenceToken.range.start, ' ')]
                }
              },
              CodeActionKind.QuickFix)];
          });
          this.addMessage({
            range: obj.referenceToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `There should be a space before a unit reference.`,
            code
          });

        }
      }
    }

  }
}