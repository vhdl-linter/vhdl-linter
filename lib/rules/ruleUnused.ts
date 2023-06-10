import { DiagnosticSeverity } from "vscode-languageserver";
import { IHasLexerToken, IHasNameToken, IHasPorts, implementsIHasDeclarations, implementsIHasGenerics, implementsIHasLexerToken, implementsIHasPorts } from "../parser/interfaces";
import { ObjectBase, OComponent, OConstant, OEntity, OFile, OPackage, OPackageBody, OPackageInstantiation, OSignal, OSubprogram, OType, OVariable } from "../parser/objects";
import { codeActionFromPrefixSuffix, IRule, RuleBase } from "./rulesBase";

export class RuleUnused extends RuleBase implements IRule {
  public static readonly ruleName = 'unused';
  file: OFile;

  private addUnusedMessage(obj: ObjectBase & (IHasLexerToken | IHasNameToken), msg: string) {
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
    const token = implementsIHasLexerToken(obj) ? obj.lexerToken : obj.nameToken;
    const { unusedPrefix, unusedSuffix } = this.settings.style;
    const code = codeActionFromPrefixSuffix(token, unusedPrefix, unusedSuffix, this.vhdlLinter);
    if (code !== undefined || (unusedPrefix === '' && unusedSuffix === '')) {
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
      const type = port.subtypeIndication.typeNames[0]?.definitions?.get(0);
      // Ignore ports of protected types as they are assumed to have side-effects so will not be read/written
      if ((type instanceof OType && (type.protected || type.protectedBody))) {
        continue;
      }
      const names = port.nameLinks.slice(0);
      names.push(...port.aliasLinks.flatMap(alias => alias.nameLinks));
      const writes = names.filter(token => token.write);
      const reads = names.filter(token => !token.write);
      if (port.direction === 'in' && reads.length === 0) {
        this.addUnusedMessage(port, `Not reading input port '${port.lexerToken.text}'`);
      } else if (port.direction === 'out' && writes.length === 0) {
        this.addUnusedMessage(port, `Not writing output port '${port.lexerToken.text}'`);
      } else if (port.direction === 'inout') {
        if (names.length === 0) {
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
          if (generic.nameLinks.filter(token => token.write === false).length === 0) {
            this.addUnusedMessage(generic, `Not reading generic ${generic.lexerToken.text}`);
          }
        }
      }
      if (implementsIHasDeclarations(obj)) {
        for (const declaration of obj.declarations) {
          if (declaration instanceof OType) {
            const references = declaration.nameLinks.slice(0);
            references.push(...declaration.aliasLinks.flatMap(alias => alias.nameLinks));
            if (references.length === 0) {
              this.addUnusedMessage(declaration, `Not using type ${declaration.lexerToken.text}`);
            }
          } else if (declaration instanceof OComponent) {
            if (declaration.nameLinks.length === 0) {
              this.addUnusedMessage(declaration, `Not using component ${declaration.lexerToken.text}`);
            }
          } else if (declaration instanceof OPackageInstantiation) {
            if (declaration.nameLinks.length === 0) {
              this.addUnusedMessage(declaration, `Not using package instantiation ${declaration.lexerToken.text}`);
            }
          } else if (declaration instanceof OSignal || declaration instanceof OVariable) {
            const typeName = declaration instanceof OSignal ? 'signal' : 'variable;';
            const references = declaration.nameLinks.slice(0);
            references.push(...declaration.aliasLinks.flatMap(alias => alias.nameLinks));
            const writes = references.filter(token => token.write);
            const reads = references.filter(token => !token.write);
            if (references.length === 0) {
              this.addUnusedMessage(declaration, `Not using ${typeName} '${declaration.lexerToken.text}'`);
            } else if (reads.length === 0) {
              this.addUnusedMessage(declaration, `Not reading ${typeName} '${declaration.lexerToken.text}'`);
            } else if (writes.length === 0) {
              // Assume protected type has side-effect and does not net writing to.
              const type = declaration.subtypeIndication.typeNames[0]?.definitions?.get(0);
              if ((type instanceof OType && (type.protected || type.protectedBody)) === false) {
                this.addUnusedMessage(declaration, `Not writing ${typeName} '${declaration.lexerToken.text}'`);
              }
            }
          } else if (declaration instanceof OConstant) {
            const references = declaration.nameLinks.slice(0);
            references.push(...declaration.aliasLinks.flatMap(alias => alias.nameLinks));
            if (references.filter(token => !token.write).length === 0) {
              this.addUnusedMessage(declaration, `Not reading constant ${declaration.lexerToken.text}`);
            }
          } else if (declaration instanceof OSubprogram) {
            // Skip implicitly declared deallocate
            if (declaration.lexerToken.getLText() === 'deallocate') {
              continue;
            }
            const references = declaration.nameLinks.slice(0);
            references.push(...declaration.aliasLinks.flatMap(alias => alias.nameLinks));
            if (references.length === 0) {
              this.addUnusedMessage(declaration, `Not using subprogram ${declaration.lexerToken.text}`);
            }
          }
        }
      }
    }
  }
}