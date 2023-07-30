import { DiagnosticSeverity } from "vscode-languageserver";
import { OAttributeName, OFile } from "../objects/objectsIndex";
import { IRule, RuleBase } from "./rulesBase";

export class RuleAttribute extends RuleBase implements IRule {
  public static readonly ruleName = 'attribute';
  file: OFile;

  check() {
    for (const obj of this.file.objectList) {
      if (obj instanceof OAttributeName) {
        if (obj.prefix === undefined) {
          this.addMessage({
            range: obj.range,
            severity: DiagnosticSeverity.Warning,
            message: `Attribute without a prefix found. If there is a prefix there is a problem with vhdl-linter.`
          });
        }
      }
    }

  }
}