import { DiagnosticSeverity } from "vscode-languageserver";
import { IHasLexerToken, IHasPorts, IHasReferenceToken, implementsIHasDeclarations, implementsIHasGenerics, implementsIHasLexerToken, implementsIHasPorts } from "../parser/interfaces";
import { ObjectBase, OComponent, OConstant, OEntity, OFile, OPackage, OPackageBody, ORead, OSignal, OSubprogram, OType, OVariable, OWrite } from "../parser/objects";
import { codeActionFromPrefixSuffix, IRule, RuleBase } from "./rulesBase";

export class RuleUnused extends RuleBase implements IRule {
  public static readonly ruleName = 'unused';
  file: OFile;

  private addUnusedMessage(obj: ObjectBase & (IHasLexerToken | IHasReferenceToken), msg: string) {
    // ignore unused warnings in packages (they are globally visible)
    if (obj.parent instanceof OPackage || obj.parent instanceof OPackageBody) {
      return;
    }
    // ignore unused warnings in protected types (they are globally visible)
    if (obj.parent instanceof OType && (obj.parent.protected || obj.parent.protectedBody)) {
      return;
    }
    // ignore entities that do not have the architecture in the same file
    if (obj.parent instanceof OEntity && obj.rootFile.architectures.find(a => a.entityName.getLText() === (obj.parent as OEntity).lexerToken.getLText()) === undefined) {
      return;
    }
    const token = implementsIHasLexerToken(obj) ? obj.lexerToken : obj.referenceToken;
    const {unusedPrefix, unusedSuffix} = this.settings.style;
    const code = codeActionFromPrefixSuffix(token, unusedPrefix, unusedSuffix, this.vhdlLinter);
    if (code !== undefined || (unusedPrefix.trim() === '' && unusedSuffix.trim() === '')) {
      this.addMessage({
        range: token.range,
        severity: DiagnosticSeverity.Warning,
        message: msg,
        code
      });
    }
  }

  private checkUnusedPorts(obj: ObjectBase & IHasPorts) {
    // ignore procedure/function declarations (without implementation)
    if (obj instanceof OSubprogram && obj.hasBody === false) {
      return;
    }
    // ignore component ports
    if (obj instanceof OComponent) {
      return;
    }
    for (const port of obj.ports) {
      const type = port.typeReference[0]?.definitions?.[0];
      // Ignore ports of protected types as they are assumed to have side-effects so will not be read/written
      if ((type instanceof OType && (type.protected || type.protectedBody))) {
        continue;
      }
      const references = port.referenceLinks.slice(0);
      references.push(...port.aliasReferences.flatMap(alias => alias.referenceLinks));
      const writes = references.filter(token => token instanceof OWrite);
      const reads = references.filter(token => token instanceof ORead);
      if (port.direction === 'in' && reads.length === 0) {
        this.addUnusedMessage(port, `Not reading input port '${port.lexerToken.text}'`);
      } else if (port.direction === 'out' && writes.length === 0) {
        this.addUnusedMessage(port, `Not writing output port '${port.lexerToken.text}'`);
      } else if (port.direction === 'inout') {
        if (references.length === 0) {
          this.addUnusedMessage(port, `Not using inout port '${port.lexerToken.text}'`);
        } else if (reads.length === 0) {
          this.addUnusedMessage(port, `Not reading inout port '${port.lexerToken.text}'`);
        } else if (writes.length === 0) {
          this.addUnusedMessage(port, `Not writing inout port '${port.lexerToken.text}'`);
        }
      }
    }
  }
  check() {
    for (const obj of this.file.objectList) {
      if (implementsIHasPorts(obj)) {
        this.checkUnusedPorts(obj);
      }
      // ignore generics of components
      if (implementsIHasGenerics(obj) && !(obj instanceof OComponent)) {
        for (const generic of obj.generics) {
          if (generic.referenceLinks.filter(token => token instanceof ORead).length === 0) {
            this.addUnusedMessage(generic, `Not reading generic ${generic.lexerToken.text}`);
          }

        }
      }
      if (implementsIHasDeclarations(obj)) {
        for (const declaration of obj.declarations) {
          if (declaration instanceof OType) {
            const references = declaration.referenceLinks.slice(0);
            references.push(...declaration.aliasReferences.flatMap(alias => alias.referenceLinks));
            if (references.length === 0) {
              this.addUnusedMessage(declaration, `Not using type ${declaration.lexerToken.text}`);
            }
          } else if (declaration instanceof OComponent) {
            if (declaration.referenceLinks.length === 0) {
              this.addUnusedMessage(declaration, `Not using component ${declaration.lexerToken.text}`);
            }
          } else if (declaration instanceof OSignal || declaration instanceof OVariable) {
            const typeName = declaration instanceof OSignal ? 'signal' : 'variable;';
            const references = declaration.referenceLinks.slice(0);
            references.push(...declaration.aliasReferences.flatMap(alias => alias.referenceLinks));
            const writes = references.filter(token => token instanceof OWrite);
            const reads = references.filter(token => token instanceof ORead);
            if (references.length === 0) {
              this.addUnusedMessage(declaration, `Not using ${typeName} '${declaration.lexerToken.text}'`);
            } else if (reads.length === 0) {
              this.addUnusedMessage(declaration, `Not reading ${typeName} '${declaration.lexerToken.text}'`);
            } else if (writes.length === 0) {
              // Assume protected type has side-effect and does not net writing to.
              const type = declaration.typeReference[0]?.definitions?.[0];
              if ((type instanceof OType && (type.protected || type.protectedBody)) === false) {
                this.addUnusedMessage(declaration, `Not writing ${typeName} '${declaration.lexerToken.text}'`);
              }
            }
          } else if (declaration instanceof OConstant) {
            const references = declaration.referenceLinks.slice(0);
            references.push(...declaration.aliasReferences.flatMap(alias => alias.referenceLinks));
            if (references.filter(token => token instanceof ORead).length === 0) {
              this.addUnusedMessage(declaration, `Not reading constant ${declaration.lexerToken.text}`);
            }
          } else if (declaration instanceof OSubprogram) {
            // Skip implicitly declared deallocate
            if (declaration.lexerToken.getLText() === 'deallocate') {
              continue;
            }
            const references = declaration.referenceLinks.slice(0);
            references.push(...declaration.aliasReferences.flatMap(alias => alias.referenceLinks));
            if (references.length === 0) {
              this.addUnusedMessage(declaration, `Not using subprogram ${declaration.lexerToken.text}`);
            }
          }
        }
      }
    }
  }
}