import { DiagnosticSeverity } from "vscode-languageserver";
import * as I from "../parser/interfaces";
import * as O from "../parser/objects";
import { IRule, RuleBase } from "./rulesBase";

export class RuleNotAllowed extends RuleBase implements IRule {
  public static readonly ruleName = 'not-allowed';
  file: O.OFile;

  pushNotAllowed(parent: O.ObjectBase, text: string, declaration: O.ODeclaration) {
    let name: string = (Object.getPrototypeOf(parent) as O.ObjectBase).constructor.name.slice(1) ?? 'here';
    if (parent instanceof O.OType && parent.protected) {
      name = 'protected type';
    } else if (parent instanceof O.OType && parent.protectedBody) {
      name = 'protected body';
    }
    this.addMessage({
      message: `${text} is not allowed in ${name}`,
      range: declaration.range,
      severity: DiagnosticSeverity.Error
    });
  }
  check() {
    for (const obj of this.file.objectList) {
      if (I.implementsIHasDeclarations(obj)) {
        for (const declaration of obj.declarations) {
          if (declaration instanceof O.OSignal) {
            if (obj instanceof O.OType && (obj.protected || obj.protectedBody)) {
              this.pushNotAllowed(obj, 'signal declaration', declaration);
            }
            if (obj instanceof O.OPackageBody || obj instanceof O.OConfigurationDeclaration || obj instanceof O.OProcess || obj instanceof O.OSubprogram) {
              this.pushNotAllowed(obj, 'signal declaration', declaration);
            }
          } else if (declaration instanceof O.OConstant) {
            if (obj instanceof O.OType && obj.protected) {
              this.pushNotAllowed(obj, 'constant declaration', declaration);
            }
            if (obj instanceof O.OConfigurationDeclaration) {
              this.pushNotAllowed(obj, 'constant declaration', declaration);
            }
          } else if (declaration instanceof O.OVariable) {
            if (declaration.shared) {
              if (obj instanceof O.OProcess
                || obj instanceof O.OSubprogram
                || (obj instanceof O.OType && obj.protectedBody)
                || (obj instanceof O.OType && obj.protected)
                || (obj instanceof O.OConfigurationDeclaration)) {
                this.pushNotAllowed(obj, 'shared variable declaration', declaration);
              }

            } else {
              if (obj instanceof O.OType && obj.protected
                || obj instanceof O.OConfigurationDeclaration
                || obj instanceof O.OEntity
                || obj instanceof O.OArchitecture) {
                this.pushNotAllowed(obj, 'variable declaration', declaration);
              }
            }
          } else if (declaration instanceof O.OAttributeDeclaration) {
            if ((obj instanceof O.OType && obj.protected)
              || obj instanceof O.OConfigurationDeclaration
            ) {
              this.pushNotAllowed(obj, 'attribute declaration', declaration);
            }

          } else if (declaration instanceof O.OType) {
            if (obj instanceof O.OType && obj.protected) {
              this.pushNotAllowed(obj, 'type declaration', declaration);
            }
            if (obj instanceof O.OConfigurationDeclaration) {
              this.pushNotAllowed(obj, 'type declaration', declaration);
            }
          } else if (declaration instanceof O.OSubType) {
            if (obj instanceof O.OType && obj.protected) {
              this.pushNotAllowed(obj, 'subtype declaration', declaration);
            }
            if (obj instanceof O.OConfigurationDeclaration) {
              this.pushNotAllowed(obj, 'subtype declaration', declaration);
            }
          } else if (declaration instanceof O.OAlias) {
            if (obj instanceof O.OType && obj.protected
              || obj instanceof O.OConfigurationDeclaration) {
              this.pushNotAllowed(obj, 'alias declaration', declaration);
            }
          } else if (declaration instanceof O.OPackageInstantiation) {
            if (obj instanceof O.OType && obj.protected) {
              this.pushNotAllowed(obj, 'package instantiation', declaration);
            }
            if (obj instanceof O.OConfigurationDeclaration) {
              this.pushNotAllowed(obj, 'package instantiation', declaration);
            }
          } else if (declaration instanceof O.OComponent) {
            if (obj instanceof O.OEntity
              || obj instanceof O.OPackageBody
              || obj instanceof O.OProcess
              || obj instanceof O.OSubprogram
              || obj instanceof O.OConfigurationDeclaration
              || obj instanceof O.OType) {
              this.pushNotAllowed(obj, 'component declaration', declaration);
            }
          } else if (declaration instanceof O.OSubprogram && declaration.hasBody) {
            if (obj instanceof O.OPackage
              || obj instanceof O.OConfigurationDeclaration
              || (obj instanceof O.OType && obj.protected)) {
              this.pushNotAllowed(obj, 'subprogram body', declaration);
            }
          } else if (declaration instanceof O.OSubprogram) {
            if (obj instanceof O.OConfigurationDeclaration) {
              this.pushNotAllowed(obj, 'subprogram', declaration);
            }
          } else if (declaration instanceof O.OFileVariable) {
            if (obj instanceof O.OType && obj.protected) {
              this.pushNotAllowed(obj, 'file variable', declaration);
            }
            if (obj instanceof O.OConfigurationDeclaration) {
              this.pushNotAllowed(obj, 'file variable', declaration);
            }
          } else if (declaration instanceof O.OConfigurationSpecification) {
            if (obj instanceof O.OArchitecture === false) {
              this.pushNotAllowed(obj, 'configuration specification', declaration);
            }
          } else if (declaration instanceof O.OPackage) {
            if (obj instanceof O.OType && obj.protected
              || obj instanceof O.OConfigurationDeclaration
              ) {
              this.pushNotAllowed(obj, 'package', declaration);
            }

          } else if (declaration instanceof O.OPackageBody) {
            if (obj instanceof O.OPackage
              || obj instanceof O.OType && obj.protected
              || obj instanceof O.OConfigurationDeclaration
              ) {
              this.pushNotAllowed(obj, 'package body', declaration);
            }

          }
        }
      }
    }
  }
}