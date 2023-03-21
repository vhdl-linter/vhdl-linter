import { DiagnosticSeverity } from "vscode-languageserver";
import { OComponent, OConfigurationSpecification, OEntity, OFile, OInstantiation } from "../parser/objects";
import { IRule, RuleBase } from "./rulesBase";

export class RuleCodingStyle extends RuleBase implements IRule {
  public static readonly ruleName = 'coding-style';
  file: OFile;

  check() {
    if (this.settings.style.portOmission) {
      this.checkPortOmission();
    }
  }
  checkPortOmission() {
    for (const instantiation of this.file.objectList) {
      if (instantiation instanceof OInstantiation) {
        if (instantiation.definitions.length === 1) { // In case of multiple definitions this check will not be run (maybe create separate rule)
          const definition = instantiation.definitions[0];
          if (definition instanceof OEntity || definition instanceof OComponent || definition instanceof OConfigurationSpecification) {
            // Ignore subprograms as these normally have less parameters, and its harder to miss connections. (Which this rule tries to prevent)
            const portsOmitted = definition.ports.filter(port => {
              return instantiation.portAssociationList?.children.find(child => child.formalPart.some(formalPart => formalPart.definitions.some(def => def === port))) === undefined
              && port.defaultValue !== undefined; // When there is not default value this is already checked in ruleInstantiation
            });
            if (portsOmitted.length > 0) {
              this.addMessage({
                message: `Omitted ports where found: ${portsOmitted.map(port => `'${port.lexerToken.text}'`).join(', ')}. Please explicitly mark as unconnected by using open.`,
                range: instantiation.range.getLimitedRange(1),
                severity: DiagnosticSeverity.Warning
              });
            }
          }
        }
      }
    }
  }
}