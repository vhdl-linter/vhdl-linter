import { findBestMatch } from "string-similarity";
import { CodeAction, CodeActionKind, Command, DiagnosticSeverity, DocumentUri, Range, TextEdit } from "vscode-languageserver";
import * as I from "../parser/interfaces";
import * as O from "../objects/objectsIndex";
import { IAddSignalCommandArguments } from "../vhdlLinter";
import { IRule, RuleBase } from "./rulesBase";

export class RuleNotDeclared extends RuleBase implements IRule {
  public static readonly ruleName = 'not-declared';
  private findUsePackageActions(ref: O.OName): CodeAction[] {
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
        if (I.implementsIHasLexerToken(type) && type.lexerToken.getLText() === ref.nameToken.getLText()) {
          let library = pkg.rootFile.targetLibrary ?? 'work';
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
            [root.rootFile.uri.toString()]: [TextEdit.insert(pos, newText)]
          }
        },
        CodeActionKind.QuickFix
      ));

    }
    return actions;
  }
  private isPrefixOfSelectedName(ref: O.OName) {
    if (ref instanceof O.OSelectedName === false) {
      for (const obj of this.file.objectList) {
        if (obj instanceof O.OSelectedName && obj.prefixTokens[0] === ref) {
          return true;
        }
      }
    }
    return false;
  }
  private findAddLibraryActions(ref: O.OName): CodeAction[] {
    const actions: CodeAction[] = [];
    let root = ref.getRootElement();
    if (root instanceof O.OArchitecture && root.correspondingEntity) {
      root = root.correspondingEntity;
    } else if (root instanceof O.OPackageBody && root.correspondingPackage) {
      root = root.correspondingPackage;
    }
    // Only prefix of a selected name
    if (this.isPrefixOfSelectedName(ref)) {
      actions.push(CodeAction.create(
        `add library declaration for ${ref.nameToken.text}`,
        {
          changes: {
            [root.rootFile.uri.toString()]: [TextEdit.insert(root.range.start, `library ${ref.nameToken.text};\n`)]
          }
        },
        CodeActionKind.QuickFix
      ));
    }
    return actions;
  }
  private findChangeLibraryActions(ref: O.OSelectedName): CodeAction[] {
    const actions: CodeAction[] = [];
    const possibleObjects = (this.vhdlLinter.projectParser.packages as O.ObjectBase[]).concat(this.vhdlLinter.projectParser.entities);
    for (const object of possibleObjects) {
      if (I.implementsIHasLexerToken(object) && object.lexerToken.getLText() === ref.nameToken.getLText()) {
        const library = object.rootFile.targetLibrary ?? 'work';
        const changes: Record<DocumentUri, TextEdit[]> = {};
        let root = ref.getRootElement();
        if (root instanceof O.OArchitecture && root.correspondingEntity) {
          root = root.correspondingEntity;
        } else if (root instanceof O.OPackageBody && root.correspondingPackage) {
          root = root.correspondingPackage;
        }
        if (root.libraries.find(libraryIt => libraryIt.lexerToken.getLText() === library.toLowerCase()) === undefined) {
          changes[root.rootFile.uri.toString()] = [TextEdit.insert(root.range.start, `library ${library};\n`)];
        }
        const replaceEdit = TextEdit.replace(ref.prefixTokens.at(-1)!.nameToken.range, library);
        if (ref.rootFile.uri.toString() in changes) {
          changes[ref.rootFile.uri.toString()]!.push(replaceEdit);
        } else {
          changes[ref.rootFile.uri.toString()] = [replaceEdit];
        }
        actions.push(CodeAction.create(
          `Change library to ${library}`,
          {
            changes
          },
          CodeActionKind.QuickFix
        ));
      }
    }
    return actions;
  }
  private findAddSignalActions(ref: O.OName): CodeAction[] {
    const actions: CodeAction[] = [];
    const root = ref.getRootElement();
    // Only when in arch and not part of subtypeIndication
    if (root instanceof O.OArchitecture && ref.parent instanceof O.OSubtypeIndication === false && ref instanceof O.OSelectedName === false) {
      const args: IAddSignalCommandArguments = {
        textDocumentUri: root.rootFile.uri.toString(),
        signalName: ref.nameToken.text,
        position: root.declarationsRange.end
      };
      actions.push(CodeAction.create(
        `add ${ref.nameToken.text} as signal to architecture`,
        Command.create(`add ${ref.nameToken.text} as signal to architecture`, 'vhdl-linter:add-signal', args),
        CodeActionKind.QuickFix));
    }
    return actions;
  }
  private findReplacementActions(ref: O.OName): CodeAction[] {
    const actions: CodeAction[] = [];
    const possibleMatches: (O.ODeclaration | O.ORecordChild | O.OGeneric | O.OPort)[] = [];
    if (ref instanceof O.OSelectedName) {
      const defs = ref.prefixTokens.at(-1)!.definitions.filter(def => I.implementsIHasSubTypeIndication(def)) as (O.ObjectBase & I.IHasSubtypeIndication)[];
      for (const typeDef of defs.flatMap(def => def.subtypeIndication.typeNames).flatMap(name => name.definitions)) {
        if (I.implementsIHasDeclarations(typeDef)) {
          possibleMatches.push(...typeDef.declarations);
        }
        if (typeDef instanceof O.ORecord) {
          possibleMatches.push(...typeDef.children);
        }
      }
    } else {
      for (const [obj] of O.scope(ref)) {
        if (I.implementsIHasDeclarations(obj)) {
          possibleMatches.push(...obj.declarations);
        }
        if (I.implementsIHasPorts(obj)) {
          possibleMatches.push(...obj.ports);
        }
        if (I.implementsIHasGenerics(obj)) {
          possibleMatches.push(...obj.generics);
        }
      }
    }
    const stringMatches = possibleMatches.filter(m => I.implementsIHasLexerToken(m)).map(m => m.lexerToken!.text);
    if (stringMatches.length === 0) {
      return actions;
    }
    const bestMatch = findBestMatch(ref.nameToken.text, stringMatches);
    if (bestMatch.bestMatch.rating > 0.5) {
      actions.push(CodeAction.create(
        `Replace with ${bestMatch.bestMatch.target} (score: ${bestMatch.bestMatch.rating})`,
        {
          changes: {
            [ref.rootFile.uri.toString()]: [TextEdit.replace(Range.create(ref.nameToken.range.start, ref.nameToken.range.end), bestMatch.bestMatch.target)]
          }
        },
        CodeActionKind.QuickFix));
    }
    return actions;
  }
  private pushNotDeclaredError(reference: O.OName) {
    const code = this.vhdlLinter.addCodeActionCallback(() => {
      const actions = this.findUsePackageActions(reference);
      actions.push(...this.findAddSignalActions(reference));
      actions.push(...this.findAddLibraryActions(reference));
      actions.push(...this.findReplacementActions(reference));
      if (reference instanceof O.OSelectedName && reference.prefixTokens.at(-1)!.definitions.some(def => def instanceof O.OLibrary)) {
        actions.push(...this.findChangeLibraryActions(reference));
      }
      return actions;
    });
    this.addMessage({
      code,
      range: reference.range,
      severity: DiagnosticSeverity.Error,
      message: reference.notDeclaredHint ?? `object '${reference.nameToken.text}' is ${reference.write ? 'written' : 'referenced'} but not declared`
    });
  }
  private pushAssociationError(reference: O.OName) {
    this.addMessage({
      range: reference.range,
      severity: DiagnosticSeverity.Error,
      message: `port '${reference.nameToken.text}' does not exist`
    });
  }

  check() {

    for (const obj of this.file.objectList) {
      if (obj instanceof O.OInstantiation) { // The instantiatedUnit (selected name) will push the error
        continue;
      }
      if (obj instanceof O.OFormalName) { // Formal references handled else where
        continue;
      }
      if (obj instanceof O.OAttributeName) {
        if (obj.definitions.length === 0) {
          this.addMessage({
            range: obj.range,
            severity: DiagnosticSeverity.Error,
            message: `attribute '${obj.nameToken.text}' is referenced but not declared`
          });
        }
      } else if (obj instanceof O.OArchitecture && obj.correspondingEntity === undefined) {
        this.addMessage({
          range: obj.entityName.range,
          severity: DiagnosticSeverity.Error,
          message: `Did not find entity for this architecture`
        });
      } else if (obj instanceof O.OName && obj.nameToken.isIdentifier() === false) {
        // Do nothing is probably string literal
      } else if (obj instanceof O.OFormalName
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
          if (lastPrefix.definitions.some(def => I.implementsIHasLabel(def) && def.label.getLText() === lastPrefix.nameToken.getLText())) {
            // if the last prefix token references a label, we do not look for stuff inside (external names)
            continue;
          }

        }
        this.pushNotDeclaredError(obj);
      }
    }
  }

}