import { CodeAction, CodeActionKind, TextEdit } from "vscode-languageserver";
import { OLexerToken } from "../lexer";
import { OFile } from "../parser/objects";
import { ISettings } from "../settings";
import { OIDiagnostic, VhdlLinter } from "../vhdlLinter";

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

export function codeActionFromPrefixSuffix(token: OLexerToken, prefix: string, suffix: string, linter: VhdlLinter) {

  let newName = token.text;
  if (prefix.trim().length !== 0 && newName.startsWith(prefix) === false) {
    newName = `${prefix}${newName}`;
  }
  if (suffix.trim().length !== 0 && newName.endsWith(suffix) === false) {
    newName = `${newName}${suffix}`;
  }
  if (newName === token.text) {
    return;
  }
  // TODO: do an actual renaming of the object instead of just replacing
  return linter.addCodeActionCallback((textDocumentUri: string) => {
    return [
      CodeAction.create(
        `Replace with '${newName}'`,
        {
          changes: {
            [textDocumentUri]: [TextEdit.replace(token.range, newName)]
          }
        },
        CodeActionKind.QuickFix)
    ];
  });
}