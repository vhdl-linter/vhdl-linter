import { RuleBase, IRule } from "./rulesBase";
import { DiagnosticSeverity } from "vscode-languageserver";
import * as O from "../parser/objects";
import { TokenType } from "../lexer";

export class RuleOrder extends RuleBase implements IRule {
  public static readonly ruleName = 'order';
  file: O.OFile;

  check() {
    for (const obj of this.file.objectList) {
      if (obj instanceof O.OName) {
        if (obj.nameToken.type === TokenType.implicit) {
          continue;
        }
        if (obj instanceof O.OExternalName) {
          continue;
        }

        const goodDeclarations = obj.definitions.filter(definition => definition.rootFile !== obj.rootFile || definition.range.start.i < obj.nameToken.range.start.i);
        if (goodDeclarations.length === 0 && obj.definitions.length > 0) {
          this.addMessage({
            range: obj.range,
            severity: DiagnosticSeverity.Warning,
            message: `This reference '${obj.nameToken.text}' is not following the definition in line \n${obj.definitions.map(obj => `${obj.range.start.line + 1}:${obj.range.start.character + 1}`).join(', ')} `,

          });
        }
      }
    }

  }
}