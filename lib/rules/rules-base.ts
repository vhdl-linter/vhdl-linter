import { OFile } from "../parser/objects";
import { ISettings } from "../settings";
import { OIDiagnostic, VhdlLinter } from "../vhdl-linter";

export interface IRule {
  check(): void;
}
export class RuleBase {
  file: OFile;
  static readonly ruleName: string;
  constructor(public vhdlLinter: VhdlLinter, public settings: ISettings) {
    this.file = vhdlLinter.file;
  }

  addMessage(diagnostic: OIDiagnostic): void {
    this.vhdlLinter.addMessage(diagnostic, (this.constructor as typeof RuleBase).ruleName);
  }
}