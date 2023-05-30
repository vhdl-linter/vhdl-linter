import { DiagnosticSeverity } from "vscode-languageserver";
import { OLexerToken } from "../lexer";
import * as O from "../parser/objects";
import { codeActionFromPrefixSuffix, IRule, RuleBase } from "./rulesBase";

export class RuleNamingStyle extends RuleBase implements IRule {
  public static readonly ruleName = 'naming-style';
  file: O.OFile;

  checkObject(token: OLexerToken, prefix: string, suffix: string, text: string) {
    const code = codeActionFromPrefixSuffix(token, prefix, suffix, this.vhdlLinter);
    if (code === undefined) {
      // token matches prefix and suffix
      return;
    }
    this.addMessage({
      range: token.range,
      severity: DiagnosticSeverity.Warning,
      message: `${token.text} does not match the style settings for ${text} (${prefix}name${suffix})`,
      code
    });
  }

  check() {
    const styleSettings = this.settings.style;
    for (const obj of this.file.objectList) {
      if (obj instanceof O.OPort) {
        if (obj.parent instanceof O.OEntity) {
          if (obj.direction === 'in') {
            this.checkObject(obj.lexerToken, styleSettings.portInPrefix, styleSettings.portInSuffix, 'input port');
          } else if (obj.direction === 'out') {
            this.checkObject(obj.lexerToken, styleSettings.portOutPrefix, styleSettings.portOutSuffix, 'output port');
          } else if (obj.direction === 'inout') {
            this.checkObject(obj.lexerToken, styleSettings.portInoutPrefix, styleSettings.portInoutSuffix, 'inout port');
          }
        } else {
          if (obj.direction === 'in') {
            this.checkObject(obj.lexerToken, styleSettings.parameterInPrefix, styleSettings.parameterInSuffix, 'input parameter');
          } else if (obj.direction === 'out') {
            this.checkObject(obj.lexerToken, styleSettings.parameterOutPrefix, styleSettings.parameterOutSuffix, 'output parameter');
          } else if (obj.direction === 'inout') {
            this.checkObject(obj.lexerToken, styleSettings.parameterInoutPrefix, styleSettings.parameterInoutSuffix, 'inout parameter');
          }
        }
      } else if (obj instanceof O.OInstantiation && obj.label !== undefined) {
        this.checkObject(obj.label, styleSettings.instantiationLabelPrefix, styleSettings.instantiationLabelSuffix, 'instantiation label');
      } else if (obj instanceof O.OGeneric) {
        this.checkObject(obj.lexerToken, styleSettings.genericPrefix, styleSettings.genericSuffix, 'generic');
      } else if (obj instanceof O.OSignal) {
        this.checkObject(obj.lexerToken, styleSettings.signalPrefix, styleSettings.signalSuffix, 'signal');
      } else if (obj instanceof O.OConstant) {
        this.checkObject(obj.lexerToken, styleSettings.constantPrefix, styleSettings.constantSuffix, 'constant');
      } else if (obj instanceof O.OVariable) {
        this.checkObject(obj.lexerToken, styleSettings.variablePrefix, styleSettings.variableSuffix, 'variable');
      }
    }
  }
}