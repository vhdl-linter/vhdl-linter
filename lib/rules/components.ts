import { RuleBase, IRule } from "./rules-base";
import { DiagnosticSeverity } from "vscode-languageserver";
import { OFile } from "../parser/objects";

export class RComponent extends RuleBase implements IRule {
  public name = 'component';
  file: OFile;

  async check() {
  for (const architecture of this.file.architectures) {

      for (const component of architecture.components) {
        const entities = this.vhdlLinter.getEntities(component);
        if (entities.length === 0) {
          this.addMessage({
            range: component.lexerToken.range,
            severity: DiagnosticSeverity.Warning,
            message: `Could not find an entity declaration for this component (${component.lexerToken})`
          });
          continue;
        }
        // list of generics (possibly multiple occurences)
        const realGenerics = entities.flatMap(e => e.generics);
        // generics not in realEntity
        for (const generic of realGenerics) {
          if (!realGenerics.find(gen => gen.lexerTokenEquals(generic))) {
            this.addMessage({
              range: generic.lexerToken.range,
              severity: DiagnosticSeverity.Error,
              message: `no generic ${generic.lexerToken.text} on entity ${component.lexerToken}`
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
        // list of ports (possibly multiple occurences)
        const realPorts = entities.flatMap(e => e.ports);
        // ports not in realEntity
        for (const port of component.ports) {
          if (!realPorts.find(p => p.lexerTokenEquals(port))) {
            this.addMessage({
              range: port.lexerToken.range,
              severity: DiagnosticSeverity.Error,
              message: `no port ${port.lexerToken.text} on entity ${component.lexerToken}`
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