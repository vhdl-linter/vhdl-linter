import { RuleBase, IRule } from "./rules-base";
import { CodeAction, CodeActionKind, DiagnosticSeverity, TextEdit } from "vscode-languageserver";
import { OFile } from "../parser/objects";
import { getDocumentSettings } from "../language-server";
import { URI } from "vscode-uri";

export class RPortType extends RuleBase implements IRule {
  public name = 'port-type';
  file: OFile;

  async check() {
    for (const entity of this.file.entities) {

      const settings = (await getDocumentSettings(URI.file(this.vhdlLinter.editorPath).toString()));
      if (settings.rules.warnLogicType) {
        for (const port of entity.ports) {
          if ((settings.style.preferedLogicType === 'std_logic' && port.type[0]?.lexerToken?.text?.match(/^std_ulogic/i))
            || (settings.style.preferedLogicType === 'std_ulogic' && port.type[0]?.lexerToken?.text?.match(/^std_logic/i))) {
            const match = port.type[0].lexerToken.text.match(/^std_u?logic/i);
            if (match) {
              const replacement = port.type[0].lexerToken.text.replace(match[0], settings.style.preferedLogicType);
              const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
                const actions = [];
                actions.push(CodeAction.create(
                  `Replace with ${replacement}`,
                  {
                    changes: {
                      [textDocumentUri]: [TextEdit.replace(port.type[0].range
                        , replacement)]
                    }
                  },
                  CodeActionKind.QuickFix));
                return actions;
              });
              this.addMessage({
                range: port.type[0].range,
                severity: DiagnosticSeverity.Information,
                message: `Port should be ${replacement} but is ${port.type[0].lexerToken.text}`,
                code
              });
            }
          }
        }
      }
    }
  }
}