import * as changeCase from "change-case";
import { DiagnosticSeverity } from "vscode-languageserver";
import { OLexerToken, TokenType } from "../lexer";
import * as I from "../parser/interfaces";
import * as O from "../objects/objectsIndex";
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
      if (obj instanceof O.OGeneric || obj instanceof O.OConstant || obj instanceof O.OEnumLiteral) {
        this.checkObject(obj.lexerToken, styleSettings.constantGenericCasing);
      } else if (I.implementsIHasLexerToken(obj)) {
        this.checkObject(obj.lexerToken, styleSettings.objectCasing);
      }
    }
  }
}