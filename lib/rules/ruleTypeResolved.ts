import { CodeAction, CodeActionKind, DiagnosticSeverity, TextEdit } from "vscode-languageserver";
import { implementsIHasDeclarations } from "../parser/interfaces";
import * as O from "../parser/objects";
import { IRule, RuleBase } from "./rulesBase";

export class RuleTypeResolved extends RuleBase implements IRule {
  public static readonly ruleName = 'type-resolved';
  file: O.OFile;
  private checkObject(object: O.OPort | O.OSignal | O.ORecordChild) {
    if (object instanceof O.OPort && this.settings.style.preferredLogicTypePort === 'unresolved'
      || object instanceof O.OSignal && this.settings.style.preferredLogicTypeSignal === 'unresolved'
      || object instanceof O.ORecordChild && this.settings.style.preferredLogicTypeRecordChild === 'unresolved') {
      const type = object.subtypeIndication.typeNames[0];
      if (type) {

        const definition = type?.definitions[0];
        if (definition instanceof O.OSubType && definition.subtypeIndication.resolutionIndication.length > 0) {
          let unresolvedTypes: string[] = [];
          const lastTypeName = definition.subtypeIndication.typeNames.at(-1);
          if (lastTypeName) {
            unresolvedTypes.push(lastTypeName.nameToken.text);
          }
          const root = definition.getRootElement();
          if (implementsIHasDeclarations(root)) {
            for (const alias of root.declarations) { // IEEE defines more convenient aliases. Show them as well
              if (alias instanceof O.OAlias && alias.name[0]?.nameToken.getLText() === definition.subtypeIndication.typeNames.at(-1)?.nameToken.getLText()) {
                unresolvedTypes.push(alias.lexerToken.text);
              }
            }
          }
          // Handle casing for IEEE packages
          if (root instanceof O.OPackage && (root.lexerToken.getLText() === 'std_logic_1164' || root.lexerToken.getLText() === 'numeric_std')) {
            if (this.settings.style.ieeeCasing === 'lowercase') {
              unresolvedTypes = unresolvedTypes.map(type => type.toLowerCase());
            } else {
              unresolvedTypes = unresolvedTypes.map(type => type.toUpperCase());
            }
          }
          const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
            const actions = [];
            actions.push(...unresolvedTypes.map(unresolvedType => CodeAction.create(
              `Replace with ${unresolvedType}`,
              {
                changes: {
                  [textDocumentUri]: [TextEdit.replace(type.range
                    , unresolvedType)]
                }
              },
              CodeActionKind.QuickFix)));
            return actions;
          });
          this.addMessage({
            range: type.range,
            severity: DiagnosticSeverity.Information,
            message: `Port is using resolved subtype (${type.nameToken.text}) should use unresolved type ${unresolvedTypes.join(' or ')} `,
            code
          });
        }
      }

    } else if (object instanceof O.OPort && this.settings.style.preferredLogicTypePort === 'resolved'
      || object instanceof O.OSignal && this.settings.style.preferredLogicTypeSignal === 'resolved'
      || object instanceof O.ORecordChild && this.settings.style.preferredLogicTypeRecordChild === 'resolved') {
      const type = object.subtypeIndication.typeNames[0];
      if (type) {
        let definition = type.definitions[0];
        if (definition) {
          // For aliases check find the aliased type
          const alias = [type.nameToken.getLText()];
          while (definition instanceof O.OAlias) {
            for (const [obj] of O.scope(definition)) {
              if (implementsIHasDeclarations(obj)) {
                for (const typeIter of obj.declarations) {
                  if (typeIter instanceof O.OType && typeIter.lexerToken.getLText() === (definition as O.OAlias).name[0]!.nameToken.getLText()) {
                    definition = typeIter;
                    alias.push(typeIter.lexerToken.getLText());
                    break;
                  }

                }
              }
            }
          }
          let resolved = false;
          // The subtype of as resolved subtype is also resolved. This is not correctly checked here
          if (definition instanceof O.OSubType && definition.subtypeIndication.resolutionIndication.length > 0) {
            resolved = true;
          }
          // Type referenced is not resolved. Now try to find resolved subtype of this type or aliases of it
          if (!resolved) {
            const root = definition.getRootElement();
            let resolvedSubtype: string[] = [];
            if (implementsIHasDeclarations(root)) {
              for (const subtype of root.declarations) {
                if (subtype instanceof O.OSubType && subtype.subtypeIndication.resolutionIndication.length && alias.find(name => name == subtype.subtypeIndication.typeNames[0]?.nameToken?.getLText())) {
                  resolvedSubtype.push(subtype.lexerToken.text);
                }
              }
            }
            if (resolvedSubtype.length > 0) {
              // Handle casing for IEEE packages
              if (root instanceof O.OPackage && (root.lexerToken.getLText() === 'std_logic_1164' || root.lexerToken.getLText() === 'numeric_std')) {
                if (this.settings.style.ieeeCasing === 'lowercase') {
                  resolvedSubtype = resolvedSubtype.map(type => type.toLowerCase());
                } else {
                  resolvedSubtype = resolvedSubtype.map(type => type.toUpperCase());
                }
              }
              const code = this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) => {
                const actions = [];
                actions.push(...resolvedSubtype.map(unresolvedType => CodeAction.create(
                  `Replace with ${unresolvedType}`,
                  {
                    changes: {
                      [textDocumentUri]: [TextEdit.replace(type.range
                        , unresolvedType)]
                    }
                  },
                  CodeActionKind.QuickFix)));
                return actions;
              });
              this.addMessage({
                range: type.range,
                severity: DiagnosticSeverity.Information,
                message: `Port is using unresolved type (${type.nameToken.text}) should use resolved subtype ${resolvedSubtype.join(' or ')} `,
                code
              });
            }
          }
        }
      }
    }
  }
  check() {
    for (const object of this.file.objectList) {
      if (object instanceof O.OPort) {
        this.checkObject(object);
      }
      if (object instanceof O.OSignal) {
        this.checkObject(object);
      }
      if (object instanceof O.ORecordChild) {
        this.checkObject(object);
      }
    }
  }
}