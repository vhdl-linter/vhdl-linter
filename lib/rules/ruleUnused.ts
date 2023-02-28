import { CodeAction, CodeActionKind, DiagnosticSeverity, TextEdit } from "vscode-languageserver";
import { IHasLexerToken, IHasPorts, IHasReferenceToken, implementsIHasDeclarations, implementsIHasGenerics, implementsIHasLexerToken, implementsIHasPorts } from "../parser/interfaces";
import { ObjectBase, OComponent, OConstant, OEntity, OFile, OPackage, OPackageBody, OReference, OSignal, OSubprogram, OType, OVariable, OWrite } from "../parser/objects";
import { IRule, RuleBase } from "./rulesBase";

export class RuleUnused extends RuleBase implements IRule {
  public static readonly ruleName = 'unused';
  file: OFile;
  private unusedSignalRegex: RegExp;

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
    if (this.unusedSignalRegex.exec(token.text) === null) {
      this.addMessage({
        range: token.range,
        severity: DiagnosticSeverity.Warning,
        message: msg,
        code: this.vhdlLinter.addCodeActionCallback((textDocumentUri: string) =>
          this.unusedSignalRegex.exec(token.text + '_unused') !== null ? [CodeAction.create(
            `Add '_unused' to the name.`,
            {
              changes: {
                [textDocumentUri]: [
                  TextEdit.insert(token.range.end, `_unused`)]
              }
            },
            CodeActionKind.QuickFix)] : []
        )
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
      if ((port.direction === 'in' || port.direction === 'inout') && references.filter(token => token instanceof OReference).length === 0) {

        this.addUnusedMessage(port, `Not reading input port '${port.lexerToken.text}'`);
      }
      const writes = references.filter(token => token instanceof OWrite);
      if ((port.direction === 'out' || port.direction === 'inout') && writes.length === 0) {
        this.addUnusedMessage(port, `Not writing output port '${port.lexerToken.text}'`);
      }
    }
  }
  check() {
    this.unusedSignalRegex = new RegExp(this.settings.style.unusedSignalRegex);

    for (const obj of this.file.objectList) {
      if (implementsIHasPorts(obj)) {
        this.checkUnusedPorts(obj);
      }
      // ignore generics of components
      if (implementsIHasGenerics(obj) && !(obj instanceof OComponent)) {
        for (const generic of obj.generics) {
          if (generic.referenceLinks.filter(token => token instanceof OReference).length === 0) {
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
          }
          if (declaration instanceof OComponent) {
            if (declaration.referenceLinks.length === 0) {
              this.addUnusedMessage(declaration, `Not using component ${declaration.lexerToken.text}`);
            }
          }
          if (declaration instanceof OSignal) {

            const references = declaration.referenceLinks.slice(0);
            references.push(...declaration.aliasReferences.flatMap(alias => alias.referenceLinks));
            if (references.filter(token => token instanceof OReference).length === 0) {
              this.addUnusedMessage(declaration, `Not reading signal ${declaration.lexerToken.text}`);
            }
            if (references.filter(token => token instanceof OWrite).length === 0) {
              this.addUnusedMessage(declaration, `Not writing signal ${declaration.lexerToken.text}`);
            }
          }
          if (declaration instanceof OVariable) {
            const references = declaration.referenceLinks.slice(0);
            references.push(...declaration.aliasReferences.flatMap(alias => alias.referenceLinks));
            if (references.filter(token => token instanceof OReference).length === 0) {
              this.addUnusedMessage(declaration, `Not reading variable ${declaration.lexerToken.text}`);
            }
            if (references.filter(token => token instanceof OWrite).length === 0) {
              // Assume protected type has side-effect and does not net writing to.
              const type = declaration.typeReference[0]?.definitions?.[0];
              if ((type instanceof OType && (type.protected || type.protectedBody)) === false) {
                this.addUnusedMessage(declaration, `Not writing variable '${declaration.lexerToken.text}'`);
              }
            }
          }
          if (declaration instanceof OConstant) {
            const references = declaration.referenceLinks.slice(0);
            references.push(...declaration.aliasReferences.flatMap(alias => alias.referenceLinks));
            if (references.filter(token => token instanceof OReference).length === 0) {
              this.addUnusedMessage(declaration, `Not reading constant ${declaration.lexerToken.text}`);
            }
          }
          if (declaration instanceof OSubprogram) {
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