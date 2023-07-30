import { DiagnosticSeverity } from "vscode-languageserver";
import { OConfigurationDeclaration, OFile } from "../objects/objectsIndex";
import { IRule, RuleBase } from "./rulesBase";

export class RuleConfiguration extends RuleBase implements IRule {
  public static readonly ruleName = 'configuration';
  file: OFile;

  check() {
    for (const object of this.file.objectList) {
      if (object instanceof OConfigurationDeclaration && object.definitions.length === 0) {
        this.addMessage({
          range: object.entityName.range,
          severity: DiagnosticSeverity.Warning,
          message: `Entity ${object.entityName.text} not found.`
        });
      }
    }
  }
}