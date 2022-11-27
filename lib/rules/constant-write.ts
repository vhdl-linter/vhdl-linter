import { RuleBase, IRule } from "./rules-base";
import { DiagnosticSeverity } from "vscode-languageserver";
import { OConstant, OFile, OGeneric, OWrite } from "../parser/objects";

export class RConstantWrite extends RuleBase implements IRule {
  public name = 'constant-write';
  file: OFile;

  async check() {
    for (const obj of this.file.objectList) {
      if (obj instanceof OGeneric) {
        for (const write of obj.references.filter(token => token instanceof OWrite)) {
          this.addMessage({
            range: write.range,
            severity: DiagnosticSeverity.Error,
            message: `Generic ${obj.lexerToken} cannot be written!`
          });
        }
      }
      if (obj instanceof OConstant) {
        for (const write of obj.references.filter(token => token instanceof OWrite)) {
          this.addMessage({
            range: write.range,
            severity: DiagnosticSeverity.Error,
            message: `Constant ${obj.lexerToken} cannot be written!`
          });
        }
      }

    }
  }
}