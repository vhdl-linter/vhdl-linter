import { RuleBase, IRule } from "./rules-base";
import { DiagnosticSeverity } from "vscode-languageserver";
import { OFile, OPackage } from "../parser/objects";

export class RComponent extends RuleBase implements IRule {
  public static readonly ruleName = 'component';
  file: OFile;

  check() {
    for (const architecture of [...this.file.architectures, ...this.file.packages.filter(p => p instanceof OPackage) as OPackage[]]) {
      for (const component of architecture.components) {
        const entities = component.definitions;
        if (entities.length === 0) {
          this.addMessage({
            range: component.referenceToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `Could not find an entity declaration for this component (${component.referenceToken.text})`
          });
          continue;
        }
        // list of generics (possibly multiple occurrences)
        const realGenerics = entities.flatMap(e => e.generics);
        // generics not in realEntity
        for (const generic of realGenerics) {
          if (!realGenerics.find(gen => gen.lexerTokenEquals(generic))) {
            this.addMessage({
              range: generic.lexerToken.range,
              severity: DiagnosticSeverity.Error,
              message: `no generic ${generic.lexerToken.text} on entity ${component.referenceToken.text}`
            });
          }
        }
        // generics not in this component
        for (const generic of realGenerics) {
          if (!component.generics.find(gen => gen.lexerTokenEquals(generic))) {
            this.addMessage({
              range: component.genericRange ?? component.range,
              severity: DiagnosticSeverity.Error,
              message: `generic ${generic.lexerToken.text} is missing in this component declaration`
            });
          }
        }
        // list of ports (possibly multiple occurrences)
        const realPorts = entities.flatMap(e => e.ports);
        // ports not in realEntity
        for (const port of component.ports) {
          if (!realPorts.find(p => p.lexerTokenEquals(port))) {
            this.addMessage({
              range: port.lexerToken.range,
              severity: DiagnosticSeverity.Error,
              message: `no port ${port.lexerToken.text} on entity ${component.referenceToken.text}`
            });
          }
        }
        // generics not in this component
        for (const port of realPorts) {
          if (!component.ports.find(p => p.lexerTokenEquals(port))) {
            this.addMessage({
              range: component.portRange ?? component.range,
              severity: DiagnosticSeverity.Error,
              message: `port ${port.lexerToken.text} is missing in this component declaration`
            });
          }
        }
      }
    }
  }
}