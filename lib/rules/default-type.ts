import { RuleBase, IRule } from "./rules-base";
import { CodeAction, CodeActionKind, DiagnosticSeverity, TextEdit } from "vscode-languageserver";
import { implementsIHasType, OFile } from "../parser/objects";
import { URI } from "vscode-uri";

export class RDefaultType extends RuleBase implements IRule {
  public name = 'default-type';
  file: OFile;

  async check() {
    const settings = (await this.vhdlLinter.settingsGetter(URI.file(this.vhdlLinter.editorPath).toString()));
    if (settings.rules.warnLogicType) {
    for (const object of this.file.objectList) {

        if (implementsIHasType(object)) {
          if ((settings.style.preferedLogicType === 'std_logic' && object.type[0]?.lexerToken?.text?.match(/^std_ulogic/i))
            || (settings.style.preferedLogicType === 'std_ulogic' && object.type[0]?.lexerToken?.text?.match(/^std_logic/i))) {
            const match = object.type[0].lexerToken.text.match(/^std_u?logic/i);
            if (match) {
              const replacement = object.type[0].lexerToken.text.replace(match[0], settings.style.preferedLogicType);
              const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
                const actions = [];
                actions.push(CodeAction.create(
                  `Replace with ${replacement}`,
                  {
                    changes: {
                      [textDocumentUri]: [TextEdit.replace(object.type[0].range
                        , replacement)]
                    }
                  },
                  CodeActionKind.QuickFix));
                return actions;
              });
              this.addMessage({
                range: object.type[0].range,
                severity: DiagnosticSeverity.Information,
                message: `Type should be ${replacement} but is ${object.type[0].lexerToken.text}`,
                code
              });
            }
          }
        }
      }
    }
  }
}