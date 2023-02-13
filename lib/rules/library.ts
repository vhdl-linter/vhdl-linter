import { RuleBase, IRule } from "./rules-base";
import { DiagnosticSeverity } from "vscode-languageserver";
import { OFile, OI, OIRange } from "../parser/objects";

export class RLibrary extends RuleBase implements IRule {
  public static readonly ruleName = 'library';
  file: OFile;

  check() {
    for (const entity of this.file.entities) {
      if (typeof entity.targetLibrary === 'undefined') {
        this.addMessage({
          range: new OIRange(this.file, new OI(this.file, 0, 0), new OI(this.file, 1, 0)),
          severity: DiagnosticSeverity.Warning,
          message: `Please define library magic comment \n --!@library libraryName`
        });
      }
    }
  }
}