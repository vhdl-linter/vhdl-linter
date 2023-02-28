import { findBestMatch } from "string-similarity";
import { CodeAction, CodeActionKind, Command, DiagnosticSeverity, Range, TextEdit } from "vscode-languageserver";
import * as I from "../parser/interfaces";
import * as O from "../parser/objects";
import { IAddSignalCommandArguments } from "../vhdlLinter";
import { IRule, RuleBase } from "./rulesBase";

export class RuleNotDeclared extends RuleBase implements IRule {
  public static readonly ruleName = 'not-declared';
  private findUsePackageActions(ref: O.OName, textDocumentUri: string): CodeAction[] {
    const actions: CodeAction[] = [];
    const proposals = new Set<string>();
    let root = ref.getRootElement();
    if (root instanceof O.OArchitecture && root.correspondingEntity) {
      root = root.correspondingEntity;
    } else if (root instanceof O.OPackageBody && root.correspondingPackage) {
      root = root.correspondingPackage;
    }
    const pos = root.range.start;
    for (const pkg of this.vhdlLinter.projectParser.packages) {
      for (const type of pkg.declarations) {
        if (I.implementsIHasLexerToken(type) && type.lexerToken.getLText() === ref.referenceToken.getLText()) {
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
  private pushNotDeclaredError(reference: O.OName) {
    const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
      const actions: CodeAction[] = [];
      actions.push(...this.findUsePackageActions(reference, textDocumentUri));
      // If parent is Signal, Port or Variable this reference is in the type reference. So adding signal makes no sense.
      if (reference.parent instanceof O.OSignal === false && reference.parent instanceof O.OPort === false && reference.parent instanceof O.OVariable === false) {
        for (const architecture of this.file.architectures) {
          const args: IAddSignalCommandArguments = { textDocumentUri, signalName: reference.referenceToken.text, position: architecture.declarationsRange.end ?? architecture.range.start };
          actions.push(CodeAction.create(
            'add signal to architecture',
            Command.create('add signal to architecture', 'vhdl-linter:add-signal', args),
            CodeActionKind.QuickFix));
        }
      }
      const possibleMatches = this.file.objectList
        .filter(obj => typeof obj !== 'undefined' && I.implementsIHasLexerToken(obj))
        .map(obj => (obj as I.IHasLexerToken).lexerToken.text);
      const bestMatch = findBestMatch(reference.referenceToken.text, possibleMatches);
      if (bestMatch.bestMatch.rating > 0.5) {
        actions.push(CodeAction.create(
          `Replace with ${bestMatch.bestMatch.target} (score: ${bestMatch.bestMatch.rating})`,
          {
            changes: {
              [textDocumentUri]: [TextEdit.replace(Range.create(reference.range.start, reference.range.end), bestMatch.bestMatch.target)]
            }
          },
          CodeActionKind.QuickFix));
      }
      return actions;
    });
    this.addMessage({
      code,
      range: reference.range,
      severity: DiagnosticSeverity.Error,
      message: reference.notDeclaredHint ?? `object '${reference.referenceToken.text}' is ${reference.write ? 'written' : 'referenced'} but not declared`
    });
  }
  private pushAssociationError(reference: O.OName) {
    this.addMessage({
      range: reference.range,
      severity: DiagnosticSeverity.Error,
      message: `port '${reference.referenceToken.text}' does not exist`
    });
  }

  check() {

    for (const obj of this.file.objectList) {
      if (obj instanceof O.OInstantiation) { // Instantiation handled somewhere else, where?
        continue;
      }
      if (obj instanceof O.OLibraryReference) { // handled in rules/library-reference
        continue;
      }
      if (obj instanceof O.OFormalReference) { // Formal references handled else where
        // TODO handle Formal references for function calls in assignments
        continue;
      }
      if (obj instanceof O.OAttributeReference) {
        if (obj.definitions.length === 0) {
          this.addMessage({
            range: obj.range,
            severity: DiagnosticSeverity.Error,
            message: `attribute '${obj.referenceToken.text}' is referenced but not declared`
          });
        }
      } else if (obj instanceof O.OArchitecture && obj.correspondingEntity === undefined) {
        this.addMessage({
          range: obj.entityName.range,
          severity: DiagnosticSeverity.Error,
          message: `Did not find entity for this architecture`
        });
      } else if (obj instanceof O.OName && obj.referenceToken.isIdentifier() === false) {
        // Do nothing is probably string literal
      } else if (obj instanceof O.OFormalReference
        && obj.parent instanceof O.OAssociation && obj.definitions.length === 0) {
        // Check for formal references (ie. port names).
        const instOrPackage = obj.parent.parent.parent;
        // if instantiations entity/component/subprogram is not found, don't report read errors
        if (instOrPackage instanceof O.OInstantiation && instOrPackage.definitions.length > 0) {
          this.pushAssociationError(obj);
        }
      } else if ((obj instanceof O.OName) && obj.definitions.length === 0 && !(obj instanceof O.OComponent)) {
        if (obj instanceof O.OSelectedName) {
          const lastPrefix = obj.prefixTokens[obj.prefixTokens.length - 1]!;
          if (lastPrefix.definitions.length === 0) {
            // if the last prefix token was not defined, do not push another not declared error
            continue;
          }
          if (lastPrefix.definitions.some(def => I.implementsIHasLabel(def) && def.label.getLText() === lastPrefix.referenceToken.getLText())) {
            // if the last prefix token references a label, we do not look for stuff inside (external names)
            continue;
          }

        }
        this.pushNotDeclaredError(obj);
      }
    }
  }

}