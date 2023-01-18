import { findBestMatch } from "string-similarity";
import { CodeAction, CodeActionKind, Command, DiagnosticSeverity, Position, Range, TextEdit } from "vscode-languageserver";
import { IHasLexerToken, implementsIHasLexerToken, implementsIHasUseClause } from "../parser/interfaces";
import { OArchitecture, OAssociation, OAttributeReference, OFormalReference, OInstantiation, OLabelReference, OPackageBody, OPort, OReference, OSignal, OUseClause, OVariable, OWrite } from "../parser/objects";
import { IAddSignalCommandArguments } from "../vhdl-linter";
import { IRule, RuleBase } from "./rules-base";
export class RNotDeclared extends RuleBase implements IRule {
  public name = 'not-declared';
  private findPossiblePackage(ref: OReference, textDocumentUri: string): CodeAction[] {
    const actions: CodeAction[] = [];
    for (const pkg of this.vhdlLinter.projectParser.packages) {
      for (const type of pkg.types) {
        if (type.lexerToken.getLText() === ref.referenceToken.getLText()) {
          let root = ref.getRootElement();
          if (root instanceof OArchitecture && root.correspondingEntity) {
            root = root.correspondingEntity;
          } else if (root instanceof OPackageBody && root.correspondingPackage) {
            root = root.correspondingPackage;
          }
          const pos = root.range.start;
          let library = pkg.targetLibrary ? pkg.targetLibrary : 'work';
          if (library === 'work' && pkg.rootFile.file.match(/ieee/i)) {
            library = 'ieee';
          }
          let newText = `use ${library}.${pkg.lexerToken}.all;\n`;
          if (root.libraries.find(libraryIt => libraryIt.lexerToken.getLText() === library.toLowerCase()) === undefined) {
            newText = `library ${library};\n${newText}`;
          }
          actions.push(CodeAction.create(
            `add use statement for ${library}.${pkg.lexerToken}`,
            {
              changes: {
                [textDocumentUri]: [TextEdit.insert(pos, newText)]
              }
            },
            CodeActionKind.QuickFix
          ));
        }
      }
    }
    return actions;
  }
  private pushNotDeclaredError(token: OReference) {
    const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
      const actions: CodeAction[] = [];
      actions.push(...this.findPossiblePackage(token, textDocumentUri));
      for (const o of this.file.objectList) {
        if (implementsIHasUseClause(o)) {
          for (const pkg of o.packageDefinitions) {
            const thing = pkg.constants.find(constant => constant.lexerToken.getLText() === token.referenceToken.getLText()) || pkg.types.find(type => type.lexerToken.getLText() === token.referenceToken.getLText())
              || pkg.subprograms.find(subprogram => subprogram.lexerToken.getLText() === token.referenceToken.getLText());
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
      // If parent is Signal, Port or Variable this reference is in the type reference. So adding signal makes no sense.
      if (token.parent instanceof OSignal === false && token.parent instanceof OPort === false && token.parent instanceof OVariable) {
        for (const architecture of this.file.architectures) {
          const args: IAddSignalCommandArguments = { textDocumentUri, signalName: token.referenceToken.text, position: architecture.endOfDeclarativePart ?? architecture.range.start };
          actions.push(CodeAction.create(
            'add signal to architecture',
            Command.create('add signal to architecture', 'vhdl-linter:add-signal', args),
            CodeActionKind.QuickFix));
        }
      }
      const possibleMatches = this.file.objectList
        .filter(obj => typeof obj !== 'undefined' && implementsIHasLexerToken(obj))
        .map(obj => (obj as IHasLexerToken).lexerToken.text);
      const bestMatch = findBestMatch(token.referenceToken.text, possibleMatches);
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
      message: `signal '${token.referenceToken.text}' is ${token instanceof OWrite ? 'written' : 'referenced'} but not declared`
    });
  }
  private pushAssociationError(reference: OReference) {
    const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
      const actions = [];
      for (const o of this.file.objectList) {
        if (implementsIHasUseClause(o)) {
          for (const pkg of o.packageDefinitions) {
            const thing = pkg.constants.find(constant => constant.lexerToken.getLText() === reference.referenceToken.getLText()) || pkg.types.find(type => type.lexerToken.getLText() === reference.referenceToken.getLText())
              || pkg.subprograms.find(subprogram => subprogram.lexerToken.getLText() === reference.referenceToken.getLText());
            if (thing) {
              const architecture = reference.getRootElement();
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
      range: reference.range,
      code: code,
      severity: DiagnosticSeverity.Error,
      message: `port '${reference.referenceToken.text}' does not exist`
    });
  }
  async check() {
    for (const obj of this.file.objectList) {
      if (obj instanceof OInstantiation) { // Instantiation handled somewhere else, where?
        continue;
      }
      if (obj instanceof OFormalReference) { // Formal references handled else where
        // TODO handle Formal references for function calls in assignments
        continue;
      }
      if (obj instanceof OAttributeReference) {
        // TODO handle Attribute References
        continue;
      }
      if (obj instanceof OUseClause) {
        // Do nothing in case of use clause
        // This is already handled
      } else if (obj instanceof OArchitecture && obj.correspondingEntity === undefined) {
        this.addMessage({
          range: obj.entityName?.range ?? obj.range,
          severity: DiagnosticSeverity.Error,
          message: `Did not find entity for this architecture`
        });
      } else if (obj instanceof OReference && obj.referenceToken.isIdentifier() === false) {
        // Do nothing is probably string literal
      } else if (obj instanceof OReference && obj.parent instanceof OAssociation && obj.definitions.length === 0) {
        const instOrPackage = obj.parent.parent.parent;
        // if instantiations entity/component/subprogram is not found, don't report read errors
        if (instOrPackage instanceof OInstantiation && instOrPackage.definitions.length > 0) {
          this.pushAssociationError(obj);
        }
      } else if ((obj instanceof OReference) && obj.definitions.length === 0) {
        this.pushNotDeclaredError(obj);
      } else if ((obj instanceof OLabelReference) && obj.definitions.length === 0) {
        this.pushNotDeclaredError(obj);
      }
    }
  }

}