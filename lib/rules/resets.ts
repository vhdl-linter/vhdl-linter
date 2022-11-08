import { RuleBase, IRule } from "./rules-base";
import { CodeAction, CodeActionKind, DiagnosticSeverity, Position, TextEdit } from "vscode-languageserver";
import { OFile, OProcess, OSignal, scope } from "../parser/objects";

export class RReset extends RuleBase implements IRule {
  public name = 'reset';
  file: OFile;

  async check() {
    for (const architecture of this.file.architectures) {
      let signalLike: OSignal[] = architecture.signals;
      if (architecture.correspondingEntity !== undefined) {
        signalLike = signalLike.concat(architecture.correspondingEntity.ports);
      }
      for (const signal of signalLike) {
        for (const [obj] of scope(signal)) {
          if (obj instanceof OProcess && obj.registerProcess) {
            signal.registerProcess = obj;
            break;
          }
        }
        if (typeof signal.registerProcess === 'undefined') {
          continue;
        }
        const registerProcess = signal.registerProcess;
        let resetFound = false;
        for (const reset of registerProcess.getResets()) {
          if (reset.toLowerCase() === signal.lexerToken.getLText()) {
            resetFound = true;
          }
        }
        if (!resetFound) {
          const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
            const actions = [];

            const change = this.file.originalText.split('\n')[registerProcess.range.start.line - 1].match(/--\s*vhdl-linter-parameter-next-line/i) === null ?
              TextEdit.insert(registerProcess.range.start, `--vhdl-linter-parameter-next-line ${signal.lexerToken.text}\n` + ' '.repeat(registerProcess.range.start.character)) :
              TextEdit.insert(Position.create(registerProcess.range.start.line - 1, this.file.originalText.split('\n')[registerProcess.range.start.line - 1].length), ` ${signal.lexerToken.text}`);
            actions.push(CodeAction.create(
              'Ignore reset for ' + signal.lexerToken,
              {
                changes: {
                  [textDocumentUri]: [change]
                }
              },
              CodeActionKind.QuickFix
            ));
            let resetValue = null;
            if (signal.type.map(read => read.lexerToken.text).join(' ').match(/^std_u?logic_vector|unsigned|signed/i)) {
              resetValue = `(others => '0')`;
            } else if (signal.type.map(read => read.lexerToken.text).join(' ').match(/^std_u?logic/i)) {
              resetValue = `'0'`;
            } else if (signal.type.map(read => read.lexerToken.text).join(' ').match(/^integer|natural|positive/i)) {
              resetValue = `0`;
            }
            if (resetValue !== null && typeof registerProcess.resetClause !== 'undefined') {
              const positionStart = Position.create(registerProcess.resetClause.range.start.line, registerProcess.resetClause.range.start.character);
              positionStart.line++;
              const indent = positionStart.character + 2;
              positionStart.character = 0;
              actions.push(CodeAction.create(
                'Add reset for ' + signal.lexerToken,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.insert(positionStart, ' '.repeat(indent) + `${signal.lexerToken} <= ${resetValue};\n`)]
                  }
                },
                CodeActionKind.QuickFix
              ));
            }
            return actions;
          });
          const range = registerProcess.range.getLimitedRange(1);
          const message = `Reset '${signal.lexerToken}' missing`;
          this.addMessage({
            range,
            code,
            severity: DiagnosticSeverity.Warning,
            message
          });
        }

      }
    }
  }
}