import { RuleBase, IRule } from "./rules-base";
import { DiagnosticSeverity } from "vscode-languageserver";
import { OConstant, OFile, OGeneric, OWrite } from "../parser/objects";

export class RConstantWrite extends RuleBase implements IRule {
  public static ruleName = 'constant-write';
  file: OFile;


  check() {

    // Writes in Associations are excluded for now, as they can not be safely checked for function overloading
    for (const obj of this.file.objectList) {
      if (obj instanceof OGeneric) {
        for (const write of obj.referenceLinks.filter(token => token instanceof OWrite && token.inAssociation === false)) {
          this.addMessage({
            range: write.range,
            severity: DiagnosticSeverity.Error,
            message: `Generic ${obj.lexerToken.text} cannot be written!`
          });
        }
      }
      if (obj instanceof OConstant) {
        for (const write of obj.referenceLinks.filter(token => token instanceof OWrite && token.inAssociation === false)) {
          this.addMessage({
            range: write.range,
            severity: DiagnosticSeverity.Error,
            message: `Constant ${obj.lexerToken.text} cannot be written!`
          });
        }
      }

    }
  }
}