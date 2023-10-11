import * as changeCase from "change-case";
import { CodeAction, CodeActionKind, DiagnosticSeverity, TextEdit } from "vscode-languageserver";
import { renameHandler } from "../languageFeatures/rename";
import { OLexerToken, TokenType } from "../lexer";
import * as I from "../parser/interfaces";
import * as O from "../parser/objects";
import { IRule, RuleBase, renameCodeAction } from "./rulesBase";

export class RuleCasingStyle extends RuleBase implements IRule {
  public static readonly ruleName = 'casing-style';
  file: O.OFile;

  checkObject(token: OLexerToken, casing: 'snake_case' | 'PascalCase' | 'camelCase' | 'CONSTANT_CASE' | 'ignore') {
    // ignore implicit tokens
    if (token.type === TokenType.implicit || casing === 'ignore') {
      return;
    }
    let newName = token.text;
    if (casing === 'snake_case') {
      newName = changeCase.snakeCase(token.text);
    } else if (casing === 'PascalCase') {
      newName = changeCase.pascalCase(token.text);
    } else if (casing === 'camelCase') {
      newName = changeCase.camelCase(token.text);
    } else if (casing === 'CONSTANT_CASE') {
      newName = changeCase.constantCase(token.text);
    } else if (casing !== 'ignore') {
      throw new Error(`${casing as string} is an invalid casing setting`);
    }
    if (newName === token.text) {
      return;
    }
    let code = String(renameCodeAction(token, newName, this.vhdlLinter));
    if (code === undefined) {
      // token matches prefix and suffix
      return;
    }
    this.vhdlLinter.casingStyleActions.push({
      token: token,
      newName: newName
    });
    code = `${code};${this.vhdlLinter.addCodeActionCallback(() => {
      return [
        CodeAction.create(
          `Auto-Fix all 'casing-style' messages in this file`,
          CodeActionKind.QuickFix),

      ];
    }, async () => {
      const mergedChanges: Record<string, TextEdit[]> = {};
      let serverInitiatedReporter;
      if (this.connection) {
        serverInitiatedReporter = await this.connection.window.createWorkDoneProgress();
        serverInitiatedReporter.begin(
          'Auto-fix running'
        );

      }
      for (const [index, casingStyleChange] of this.vhdlLinter.casingStyleActions.entries()) {
        serverInitiatedReporter?.report(100 * index / this.vhdlLinter.casingStyleActions.length);
        const change = await renameHandler(this.vhdlLinter, casingStyleChange.token.range.start, casingStyleChange.newName);
        for (const [key, fileChanges] of Object.entries(change.changes)) {
          if (mergedChanges[key] !== undefined) {
            mergedChanges[key]!.push(...fileChanges);
          } else {
            mergedChanges[key] = fileChanges;

          }
        }
      }
      serverInitiatedReporter?.done();
      return [
        CodeAction.create(
          `Auto-Fix all 'casing-style' messages in this file`,
          { changes: mergedChanges },
          CodeActionKind.QuickFix)
      ];
    })}`;
    this.addMessage({
      range: token.range,
      severity: DiagnosticSeverity.Information,
      message: `${token.text} does not match the style settings (${casing})`,
      code
    });
  }

  check() {
    const styleSettings = this.settings.style;
    for (const obj of this.file.objectList) {
      if (obj instanceof O.OGeneric || obj instanceof O.OConstant || obj instanceof O.OEnumLiteral) {
        this.checkObject(obj.lexerToken, styleSettings.constantGenericCasing);
      } else if (I.implementsIHasLexerToken(obj) && obj instanceof O.OLibrary === false) {
        // ignore library as they follow external declaration
        this.checkObject(obj.lexerToken, styleSettings.objectCasing);
      }
    }
  }
}