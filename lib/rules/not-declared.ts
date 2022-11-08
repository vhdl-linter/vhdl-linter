import { findBestMatch } from "string-similarity";
import { CodeAction, CodeActionKind, Command, DiagnosticSeverity, Position, Range, TextEdit } from "vscode-languageserver";
import { ORead, OWrite, OAssociationFormal, OInstantiation, implementsIHasUseClause, implementsIHasLexerToken, IHasLexerToken } from "../parser/objects";
import { IAddSignalCommandArguments } from "../vhdl-linter";
import { RuleBase, IRule } from "./rules-base";
export class RNotDeclared extends RuleBase implements IRule {
  public name = 'not-declared';

  private pushNotDeclaredError(token: ORead | OWrite) {
    const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
      const actions = [];
      for (const o of this.file.objectList) {
        if (implementsIHasUseClause(o)) {
          for (const pkg of o.packageDefinitions) {
            const thing = pkg.constants.find(constant => constant.lexerToken.getLText() === token.lexerToken.getLText()) || pkg.types.find(type => type.lexerToken.getLText() === token.lexerToken.getLText())
              || pkg.subprograms.find(subprogram => subprogram.lexerToken.getLText() === token.lexerToken.getLText());
            if (thing) {
              const architecture = token.getRootElement();
              const pos = Position.create(0, 0);
              if (architecture && architecture.useClauses.length > 0) {
                pos.line = architecture.useClauses[architecture.useClauses.length - 1].range.end.line + 1;
              }
              actions.push(CodeAction.create(
                'add use statement for ' + pkg.lexerToken,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.insert(pos, `use ${pkg.targetLibrary ? pkg.targetLibrary : 'work'}.${pkg.lexerToken}.all;\n`)]
                  }
                },
                CodeActionKind.QuickFix
              ));
            }
          }
        }
      }
      for (const architecture of this.file.architectures) {
        const args: IAddSignalCommandArguments = { textDocumentUri, signalName: token.lexerToken.text, position: architecture.endOfDeclarativePart ?? architecture.range.start };
        actions.push(CodeAction.create(
          'add signal to architecture',
          Command.create('add signal to architecture', 'vhdl-linter:add-signal', args),
          CodeActionKind.QuickFix));
      }
      const possibleMatches = this.file.objectList
        .filter(obj => typeof obj !== 'undefined' && implementsIHasLexerToken(obj))
        .map(obj => (obj as IHasLexerToken).lexerToken.text);
      const bestMatch = findBestMatch(token.lexerToken.text, possibleMatches);
      if (bestMatch.bestMatch.rating > 0.5) {
        actions.push(CodeAction.create(
          `Replace with ${bestMatch.bestMatch.target} (score: ${bestMatch.bestMatch.rating})`,
          {
            changes: {
              [textDocumentUri]: [TextEdit.replace(Range.create(token.range.start, token.range.end), bestMatch.bestMatch.target)]
            }
          },
          CodeActionKind.QuickFix));
      }
      return actions;
    });
    this.addMessage({
      code,
      range: token.range,
      severity: DiagnosticSeverity.Error,
      message: `signal '${token.lexerToken.text}' is ${token instanceof ORead ? 'read' : 'written'} but not declared`
    });
  }
  private pushAssociationError(read: OAssociationFormal) {
    const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
    const actions = [];
      for (const o of this.file.objectList) {
        if (implementsIHasUseClause(o)) {
          for (const pkg of o.packageDefinitions) {
            const thing = pkg.constants.find(constant => constant.lexerToken.getLText() === read.lexerToken.getLText()) || pkg.types.find(type => type.lexerToken.getLText() === read.lexerToken.getLText())
              || pkg.subprograms.find(subprogram => subprogram.lexerToken.getLText() === read.lexerToken.getLText());
            if (thing) {
              const architecture = read.getRootElement();
              const pos = Position.create(0, 0);
              if (architecture && architecture.useClauses.length > 0) {
                pos.line = architecture.useClauses[architecture.useClauses.length - 1].range.end.line + 1;
              }
              actions.push(CodeAction.create(
                'add use statement for ' + pkg.lexerToken,
                {
                  changes: {
                    [textDocumentUri]: [TextEdit.insert(pos, `use ${pkg.targetLibrary ? pkg.targetLibrary : 'work'}.${pkg.lexerToken}.all;\n`)]
                  }
                },
                CodeActionKind.QuickFix
              ));
            }
          }
        }
      }

      return actions;
    });
    this.addMessage({
      range: read.range,
      code: code,
      severity: DiagnosticSeverity.Error,
      message: `port '${read.lexerToken.text}' does not exist`
    });
  }
  async check() {
   for (const obj of this.file.objectList) {
        if ((obj instanceof ORead || obj instanceof OWrite) && obj.definitions.length === 0) {
          this.pushNotDeclaredError(obj);
        } else if (obj instanceof OAssociationFormal && obj.definitions.length === 0) {
          const instOrPackage = obj.parent.parent.parent;
          // if instantiations entity/component/subprogram is not found, don't report read errors
          if (instOrPackage instanceof OInstantiation && instOrPackage.definitions.length > 0) {
            this.pushAssociationError(obj);
          }
        }
      }
  }

  }