import { RuleBase, IRule } from "./rulesBase";
import { CodeAction, CodeActionKind, DiagnosticSeverity, TextEdit } from "vscode-languageserver";
import * as O from "../parser/objects";
import { TokenType } from "../lexer";

export class RuleConsistentCasing extends RuleBase implements IRule {
  public static readonly ruleName = 'consistent-casing';
  file: O.OFile;

  check() {
    for (const obj of this.file.objectList) {
      if (obj instanceof O.OName) {
        if (obj.nameToken.type === TokenType.implicit) {
          continue;
        }

        const differentCasing = obj.definitions.filter(definition => definition.rootFile.uri.toString().match(/ieee2008/) === null && definition.lexerToken?.getLText() === obj.nameToken.getLText() && definition.lexerToken?.text !== obj.nameToken.text);
        if (differentCasing.length > 0) {
          this.addMessage({
            range: obj.range,
            severity: DiagnosticSeverity.Warning,
            message: `This reference '${obj.nameToken.text}' is not consistent with definition:\n${differentCasing.map(obj => `'${obj.lexerToken!.text}' ${obj.rootFile.uri.pathname.split('/').at(-1)!}:${obj.range.start.line + 1}:${obj.range.start.character + 1}`).join(',\n')} `,
            code: this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
              const actions = [];
              actions.push(CodeAction.create(
                `Replace with '${differentCasing[0]!.lexerToken!.text}'`,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.replace(obj.nameToken.range, differentCasing[0]!.lexerToken!.text)]
                  }
                },
                CodeActionKind.QuickFix));
              return actions;
            })
          });
        }
      }
    }

  }
}