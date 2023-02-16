import { RuleBase, IRule } from "./rules-base";
import { DiagnosticSeverity } from "vscode-languageserver";
import { OFile, OI } from "../parser/objects";

export class REmpty extends RuleBase implements IRule {
  public static readonly ruleName = 'empty';
  file: OFile;

  check() {
    if (this.file.entities.length === 0 &&
      this.file.architectures.length === 0 &&
      this.file.packages.length === 0 &&
      this.file.contexts.length === 0 &&
      this.file.configurations.length === 0 &&
      this.file.packageInstantiations.length === 0) {
      this.addMessage({
        range: new OI(this.file, 0).getRangeToEndLine(),
        severity: DiagnosticSeverity.Warning,
        message: `This file is empty. Vhdl files must contain at least one design unit.`
      });
    }

  }
}