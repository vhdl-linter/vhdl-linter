import { DiagnosticSeverity } from "vscode-languageserver";
import { OIRange } from "../parser/objects";
import { VhdlLinter } from "../vhdlLinter";

// in contrast to the usual elaboration this has to be called for *all* cachedFiles
export class ElaborateTargetLibrary {
  constructor(private vhdlLinter: VhdlLinter) { }
  public elaborate() {
    // checks if either a magic comment or a library mapping defines a library for this file and saves it
    const fileTargetLibrary = this.vhdlLinter.projectParser.libraryMap.get(this.vhdlLinter.file.uri.toString());
    // two libraries defined
    if (this.vhdlLinter.file.targetLibrary !== undefined && fileTargetLibrary !== undefined && this.vhdlLinter.file.targetLibrary !== fileTargetLibrary?.library) {
      this.vhdlLinter.addMessage({
        message: `The library assigned in the magic comment (${this.vhdlLinter.file.targetLibrary}) does not match ${fileTargetLibrary.library} from ${this.vhdlLinter.projectParser.relativeToWorkspace(fileTargetLibrary.definitionFile)}:${fileTargetLibrary.definitionLine}.`,
        range: new OIRange(this.vhdlLinter.file, 0, this.vhdlLinter.file.lines[0]?.length ?? 1),
        severity: DiagnosticSeverity.Warning,
      }, 'elaborate');
    }

    if (this.vhdlLinter.file.targetLibrary === undefined && fileTargetLibrary !== undefined) {
      this.vhdlLinter.file.targetLibrary = fileTargetLibrary.library;
    }
  }
}