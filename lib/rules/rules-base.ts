import { OFile } from "../parser/objects";
import { OIDiagnostic, VhdlLinter } from "../vhdl-linter";

export interface IRule {
  check(): Promise<void>;
}
export class RuleBase {
  file: OFile;
  readonly name: string;
  constructor(public vhdlLinter: VhdlLinter) {
    this.file = vhdlLinter.file;
  }

  addMessage(diagnostic: OIDiagnostic): void {
    this.vhdlLinter.addMessage(diagnostic, this.name);
  }
}