import { CodeAction, TextEdit, Position, CodeActionKind } from "vscode-languageserver";
import { MagicCommentType, OFile, OIRange } from "../parser/objects";
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
  checkMagicComments(range: OIRange) {
    const matchingMagiComments = this.file.magicComments.filter(magicComment => {
      if (range.start.i < magicComment.range.start.i) {
        return false;
      }
      if (range.end.i > magicComment.range.end.i) {
        return false;
      }
      return true;
    }).filter(magicComment => {
      if (magicComment.commentType === MagicCommentType.Disable) {
        if (magicComment.rule) {
          return this.name === magicComment.rule;
        }
        return true;
      }
      return false;
    });
    return matchingMagiComments.length === 0;
  }
  addMessage(diagnostic: OIDiagnostic): void {
    if (this.checkMagicComments(diagnostic.range)) {
      const newCode = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actions = [] as any[];
        // [textDocumentUri]: [TextEdit.replace(Range.create(write.range.start, write.range.end), bestMatch.bestMatch.target)]
        actions.push(CodeAction.create(
          `Ignore ${this.name} on this line.`,
          {
            changes: {
              [textDocumentUri]: [
                TextEdit.insert(Position.create(diagnostic.range.end.line, 1000), ` -- vhdl-linter-disable-line ${this.name}`)]
            }
          },
          CodeActionKind.QuickFix));
        actions.push(CodeAction.create(
          `Ignore ${this.name} for this file.`,
          {
            changes: {
              [textDocumentUri]: [
                TextEdit.insert(Position.create(0, 0), `-- vhdl-linter-disable ${this.name}\n`)]
            }
          },
          CodeActionKind.QuickFix));
        return actions;
      });
      const codes = [];
      if (typeof diagnostic.code !== 'undefined') {
        codes.push(diagnostic.code);
      }
      codes.push(newCode);
      diagnostic.code = codes.join(';');
      diagnostic.message = diagnostic.message + ` (${this.name})`;
      this.vhdlLinter.messages.push(diagnostic);
    }

  }
}