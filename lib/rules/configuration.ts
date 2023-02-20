import { DiagnosticSeverity } from "vscode-languageserver";
import { OConfiguration, OFile } from "../parser/objects";
import { IRule, RuleBase } from "./rules-base";

export class RConfiguration extends RuleBase implements IRule {
  public static readonly ruleName = 'library-reference';
  file: OFile;

  check() {
    for (const object of this.file.objectList) {
      if (object instanceof OConfiguration && object.definitions.length === 0) {
        this.addMessage({
          range: object.entityName.range,
          severity: DiagnosticSeverity.Warning,
          message: `Entity ${object.entityName.text} not found.`
        });
      }
    }
  }
}