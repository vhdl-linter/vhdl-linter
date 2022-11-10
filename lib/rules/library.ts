import { RuleBase, IRule } from "./rules-base";
import { DiagnosticSeverity } from "vscode-languageserver";
import { OFile, OI, OIRange } from "../parser/objects";
import { URI } from "vscode-uri";

export class RLibrary extends RuleBase implements IRule {
  public name = 'library';
  file: OFile;

  async check() {
    const settings = await this.vhdlLinter.settingsGetter(URI.file(this.vhdlLinter.editorPath).toString());
    for (const entity of this.file.entities) {
      if (settings.rules.warnLibrary && entity !== undefined && typeof entity.targetLibrary === 'undefined') {
        this.addMessage({
          range: new OIRange(this.file, new OI(this.file, 0, 0), new OI(this.file, 1, 0)),
          severity: DiagnosticSeverity.Warning,
          message: `Please define library magic comment \n --!@library libraryName`
        });
      }
    }
  }
  }