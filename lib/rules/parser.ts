import { RuleBase, IRule } from "./rules-base";
import { OFile } from "../parser/objects";

export class RParser extends RuleBase implements IRule {
  public name = 'parser';
  file: OFile;

  async check() {
    for (const message of this.file.parserMessages) {
      this.addMessage(message);
    }
  }
}