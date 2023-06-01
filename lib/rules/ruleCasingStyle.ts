import { DiagnosticSeverity } from "vscode-languageserver";
import { OLexerToken, TokenType } from "../lexer";
import * as I from "../parser/interfaces";
import * as O from "../parser/objects";
import { IRule, RuleBase, renameCodeAction } from "./rulesBase";
import * as Case from "case";

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
      newName = Case.snake(token.text);
    }
    else if (casing === 'PascalCase') {
      newName = Case.pascal(token.text);
    }
    else if (casing === 'camelCase') {
      newName = Case.camel(token.text);
    }
    else if (casing === 'CONSTANT_CASE') {
      newName = Case.constant(token.text);
    }
    if (newName === token.text) {
      return;
    }
    const code = renameCodeAction(token, newName, this.vhdlLinter);
    if (code === undefined) {
      // token matches prefix and suffix
      return;
    }
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
      if (obj instanceof O.OGeneric || obj instanceof O.OConstant) {
        this.checkObject(obj.lexerToken, styleSettings.constantGenericCasing);
      } else if (I.implementsIHasLexerToken(obj)) {
        this.checkObject(obj.lexerToken, styleSettings.objectCasing);
      }
    }
  }
}