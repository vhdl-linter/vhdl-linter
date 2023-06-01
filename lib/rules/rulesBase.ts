import { CodeAction, CodeActionKind } from "vscode-languageserver";
import { renameHandler } from "../languageFeatures/rename";
import { OLexerToken, TokenType } from "../lexer";
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
  // ignore implicit tokens
  if (token.type === TokenType.implicit) {
    return;
  }
  let newName = token.text;
  if (prefix.length !== 0 && newName.startsWith(prefix) === false) {
    newName = `${prefix}${newName}`;
  }
  if (suffix.length !== 0 && newName.endsWith(suffix) === false) {
    newName = `${newName}${suffix}`;
  }
  return renameCodeAction(token, newName, linter);
}
export function renameCodeAction(token: OLexerToken, newName: string, linter: VhdlLinter) {
  if (newName === token.text) {
    return;
  }
  return linter.addCodeActionCallback(() => {
    return [
      CodeAction.create(
        `Replace with '${newName}'`,
        CodeActionKind.QuickFix)
    ];
  }, async () => {
    return [
      CodeAction.create(
        `Replace with '${newName}'`,
        await renameHandler(linter, token.range.start, newName),
        CodeActionKind.QuickFix)
    ];
  });
}