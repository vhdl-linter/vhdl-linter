import { findBestMatch } from "string-similarity";
import { CodeAction, CodeActionKind, Command, DiagnosticSeverity, Range, TextEdit } from "vscode-languageserver";
import { IHasLexerToken, implementsIHasLexerToken } from "../parser/interfaces";
import { OArchitecture, OAssociation, OAttributeReference, OComponent, OFormalReference, OInstantiation, OLabelReference, OLibraryReference, OPackageBody, OPort, OReference, OSignal, OUseClause, OVariable, OWrite } from "../parser/objects";
import { IAddSignalCommandArguments } from "../vhdl-linter";
import { IRule, RuleBase } from "./rules-base";
export class RNotDeclared extends RuleBase implements IRule {
  public static readonly ruleName = 'not-declared';
  private findUsePackageActions(ref: OReference, textDocumentUri: string): CodeAction[] {
    const actions: CodeAction[] = [];
    const proposals = new Set<string>();
    let root = ref.getRootElement();
    if (root instanceof OArchitecture && root.correspondingEntity) {
      root = root.correspondingEntity;
    } else if (root instanceof OPackageBody && root.correspondingPackage) {
      root = root.correspondingPackage;
    }
    const pos = root.range.start;
    for (const pkg of this.vhdlLinter.projectParser.packages) {
      for (const type of [...pkg.constants, ...pkg.types, ...pkg.subprograms]) {
        if (type.lexerToken.getLText() === ref.referenceToken.getLText()) {
          let library = pkg.targetLibrary ? pkg.targetLibrary : 'work';
          let pkgName = pkg.lexerToken.text;
          if (library === 'work' && pkg.rootFile.uri.pathname.match(/ieee/i)) {
            if (this.settings.style.ieeeCasing === 'lowercase') {
              pkgName = pkgName.toLowerCase();
              library = 'ieee';
            } else {
              library = 'IEEE';
            }
          }

          proposals.add(`${library}.${pkgName}`);

        }
      }
    }

    for (const proposal of [...proposals].sort()) {
      const [library, pkgName] = proposal.split('.') as [string, string];
      let newText = `use ${library}.${pkgName}.all;\n`;
      if (root.libraries.find(libraryIt => libraryIt.lexerToken.getLText() === library.toLowerCase()) === undefined) {
        newText = `library ${library};\n${newText}`;
      }
      actions.push(CodeAction.create(
        `add use statement for ${library}.${pkgName}`,
        {
          changes: {
            [textDocumentUri]: [TextEdit.insert(pos, newText)]
          }
        },
        CodeActionKind.QuickFix
      ));

    }
    return actions;
  }
  private pushNotDeclaredError(token: OReference) {
    const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
      const actions: CodeAction[] = [];
      actions.push(...this.findUsePackageActions(token, textDocumentUri));
      // If parent is Signal, Port or Variable this reference is in the type reference. So adding signal makes no sense.
      if (token.parent instanceof OSignal === false && token.parent instanceof OPort === false && token.parent instanceof OVariable === false) {
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
    this.addMessage({
      range: reference.range,
      severity: DiagnosticSeverity.Error,
      message: `port '${reference.referenceToken.text}' does not exist`
    });
  }

  check() {

    for (const obj of this.file.objectList) {
      if (obj instanceof OInstantiation) { // Instantiation handled somewhere else, where?
        continue;
      }
      if (obj instanceof OLibraryReference) { // handled in rules/library-reference
        continue;
      }
      if (obj instanceof OFormalReference) { // Formal references handled else where
        // TODO handle Formal references for function calls in assignments
        continue;
      }
      if (obj instanceof OAttributeReference) {
        if (obj.definitions.length === 0) {
          this.addMessage({
            range: obj.range,
            severity: DiagnosticSeverity.Error,
            message: `attribute '${obj.referenceToken.text}' is referenced but not declared`
          });
        }
      } else if (obj instanceof OUseClause || obj.parent instanceof OUseClause) {
        // Do nothing in case of use clause
        // This is already handled
      } else if (obj instanceof OArchitecture && obj.correspondingEntity === undefined) {
        this.addMessage({
          range: obj.entityName.range,
          severity: DiagnosticSeverity.Error,
          message: `Did not find entity for this architecture`
        });
      } else if (obj instanceof OReference && obj.referenceToken.isIdentifier() === false) {
        // Do nothing is probably string literal
      } else if (obj instanceof OFormalReference
        && obj.parent instanceof OAssociation && obj.definitions.length === 0) {
        // Check for formal references (ie. port names).
        const instOrPackage = obj.parent.parent.parent;
        // if instantiations entity/component/subprogram is not found, don't report read errors
        if (instOrPackage instanceof OInstantiation && instOrPackage.definitions.length > 0) {
          this.pushAssociationError(obj);
        }
      } else if ((obj instanceof OReference) && obj.definitions.length === 0 && !(obj instanceof OComponent)) {
        this.pushNotDeclaredError(obj);
      } else if ((obj instanceof OLabelReference) && obj.definitions.length === 0) {
        this.pushNotDeclaredError(obj);
      }
    }
  }

}