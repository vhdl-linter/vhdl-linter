import { CodeAction, CodeActionKind, DiagnosticSeverity, TextEdit } from "vscode-languageserver";
import { implementsIHasPorts, implementsIHasSignals, implementsIHasTypes } from "../parser/interfaces";
import { OAlias, OFile, OPackage, OPort, OSignal, OSubType, scope } from "../parser/objects";
import { IRule, RuleBase } from "./rules-base";

export class RTypeResolved extends RuleBase implements IRule {
  public name = 'type-resolved';
  file: OFile;
  private checkObject(object: OPort | OSignal) {
    if (object instanceof OPort && this.settings.style.preferredLogicTypePort === 'unresolved'
      || object instanceof OSignal && this.settings.style.preferredLogicTypeSignal === 'unresolved') {
      const type = object.typeReference[0];
      if (type) {

        const definition = type?.definitions[0];
        if (definition instanceof OSubType && definition.resolved) {
          let unresolvedTypes = [definition.superType.referenceToken.text];
          const root = definition.getRootElement();
          for (const alias of root.aliases) { // IEEE defines more convenient aliases. Show them as well
            if (alias.name[0]?.referenceToken.getLText() === definition.superType.referenceToken.getLText()) {
              unresolvedTypes.push(alias.lexerToken.text);
            }
          }
          // Handle casing for IEEE packages
          if (root instanceof OPackage && (root.lexerToken.getLText() === 'std_logic_1164' || root.lexerToken.getLText() === 'numeric_std')) {
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
            message: `Port is using resolved subtype (${type.referenceToken.text}) should use unresolved type ${unresolvedTypes.join(' or ')} `,
            code
          });
        }
      }

    } else if (object instanceof OPort && this.settings.style.preferredLogicTypePort === 'resolved'
      || object instanceof OSignal && this.settings.style.preferredLogicTypeSignal === 'resolved') {
      const type = object.typeReference[0];
      if (type) {
        let definition = type.definitions[0];
        if (definition) {
          // For aliases check find the aliased type
          const alias = [type.referenceToken.getLText()];
          while (definition instanceof OAlias) {
            for (const [obj] of scope(definition)) {
              if (implementsIHasTypes(obj)) {
                for (const typeIter of obj.types) {
                  if (typeIter.lexerToken.getLText() === (definition as OAlias).name[0]!.referenceToken.getLText()) {
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
          if (definition instanceof OSubType && definition.resolved) {
            resolved = true;
          }
          // Type referenced is not resolved. Now try to find resolved subtype of this type or aliases of it
          if (!resolved) {
            const root = definition.getRootElement();
            let resolvedSubtype: string[] = [];
            for (const subtype of root.types) {
              if (subtype instanceof OSubType && subtype.resolved && alias.includes(subtype.superType.referenceToken.getLText())) {
                resolvedSubtype.push(subtype.lexerToken.text);
              }
            }
            if (resolvedSubtype.length > 0) {
              // Handle casing for IEEE packages
              if (root instanceof OPackage && (root.lexerToken.getLText() === 'std_logic_1164' || root.lexerToken.getLText() === 'numeric_std')) {
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
                message: `Port is using unresolved type (${type.referenceToken.text}) should use resolved subtype ${resolvedSubtype.join(' or ')} `,
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
      if (implementsIHasPorts(object)) {
        for (const port of object.ports) {
          this.checkObject(port);
        }
      }
      if (implementsIHasSignals(object)) {
        for (const signal of object.signals) {
          this.checkObject(signal);
        }
      }
    }
  }
}