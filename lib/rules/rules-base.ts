import { CodeAction, TextEdit, Position, CodeActionKind } from "vscode-languageserver";
import { MagicCommentType, OFile, OIRange, OMagicCommentDisable } from "../parser/objects";
import { OIDiagnostic, VhdlLinter } from "../vhdl-linter";

export interface IRule {
  check(): Promise<void>;
}


export function checkMagicComments(magicComments : OMagicCommentDisable[], range: OIRange, ruleName: string) {
  const matchingMagiComments = magicComments.filter(magicComment => {
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
        return ruleName === magicComment.rule;
      }
      return true;
    }
    return false;
  });
  return matchingMagiComments.length === 0;
}

export function addIgnoreAction(diagnostic: OIDiagnostic, ruleName: string, linter: VhdlLinter) {
  const newCode = linter.addCodeActionCallback((textDocumentUri: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actions = [] as any[];
    // [textDocumentUri]: [TextEdit.replace(Range.create(write.range.start, write.range.end), bestMatch.bestMatch.target)]
    actions.push(CodeAction.create(
      `Ignore ${ruleName} on this line.`,
      {
        changes: {
          [textDocumentUri]: [
            TextEdit.insert(Position.create(diagnostic.range.end.line, 1000), ` -- vhdl-linter-disable-line ${ruleName}`)]
        }
      },
      CodeActionKind.QuickFix));
    actions.push(CodeAction.create(
      `Ignore ${ruleName} for this file.`,
      {
        changes: {
          [textDocumentUri]: [
            TextEdit.insert(Position.create(0, 0), `-- vhdl-linter-disable ${ruleName}\n`)]
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
  diagnostic.message = diagnostic.message + ` (${ruleName})`;
}

export class RuleBase {
  file: OFile;
  readonly name: string;
  constructor(public vhdlLinter: VhdlLinter) {
    this.file = vhdlLinter.file;
  }
  addMessage(diagnostic: OIDiagnostic): void {
    if (checkMagicComments(this.file.magicComments, diagnostic.range, this.name)) {
      addIgnoreAction(diagnostic, this.name, this.vhdlLinter);
      this.vhdlLinter.messages.push(diagnostic);
    }
  }
}