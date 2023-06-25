import { DiagnosticSeverity } from "vscode-languageserver";
import { OIRange } from "../parser/objects";
import { VhdlLinter } from "../vhdlLinter";

// in contrast to the usual elaboration this has to be called for *all* cached vhdl files
export function elaborateTargetLibrary(vhdlLinter: VhdlLinter) {
  // checks if either a magic comment or a library mapping defines a library for this file and saves it
  const fileTargetLibrary = vhdlLinter.projectParser.libraryMap.get(vhdlLinter.file.uri.toString());
  // two libraries defined
  if (vhdlLinter.file.targetLibrary !== undefined && fileTargetLibrary !== undefined && vhdlLinter.file.targetLibrary !== fileTargetLibrary?.library) {
    vhdlLinter.addMessage({
      message: `The library assigned in the magic comment (${vhdlLinter.file.targetLibrary}) does not match ${fileTargetLibrary.library} from ${vhdlLinter.projectParser.relativeToWorkspace(fileTargetLibrary.definitionFile)}:${fileTargetLibrary.definitionLine}.`,
      range: new OIRange(vhdlLinter.file, 0, vhdlLinter.file.lines[0]?.length ?? 1),
      severity: DiagnosticSeverity.Warning,
    }, 'elaborate');
  }

  if (vhdlLinter.file.targetLibrary === undefined && fileTargetLibrary !== undefined) {
    vhdlLinter.file.targetLibrary = fileTargetLibrary.library;
  }
}