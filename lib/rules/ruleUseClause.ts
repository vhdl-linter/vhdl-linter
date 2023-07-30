import { OFile, OUseClause } from "../objects/objectsIndex";
import { RuleBase, IRule } from "./rulesBase";

export class RuleUseClause extends RuleBase implements IRule {
  public static readonly ruleName = 'use-clause';
  file: OFile;


  check() {
    for (const obj of this.file.objectList) {
      if (obj instanceof OUseClause) {
        if (obj.names.length < 2) {
          this.addMessage({
            message: `Use clause must have selected name meaning at least on prefix and suffix.`,
            range: obj.range
          });
        }
      }
    }
  }
}