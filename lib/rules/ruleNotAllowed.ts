import { DiagnosticSeverity } from "vscode-languageserver";
import * as I from "../parser/interfaces";
import * as O from "../parser/objects";
import { IRule, RuleBase } from "./rulesBase";

export class RuleNotAllowed extends RuleBase implements IRule {
  public static readonly ruleName = 'not-allowed';
  file: O.OFile;

  pushNotAllowed(parent: O.ObjectBase, text: string) {
        let name: string = (Object.getPrototypeOf(parent) as O.ObjectBase).constructor.name.slice(1) ?? 'here';
    if (parent instanceof O.OType && parent.protected) {
      name = 'protected type';
    } else if (parent instanceof O.OType && parent.protectedBody) {
      name = 'protected body';
    }
    this.addMessage({
      message: `${text} is not allowed in ${name}`,
      range: parent.range,
      severity: DiagnosticSeverity.Error
    });
  }
  check() {
    for (const obj of this.file.objectList) {
      if (I.implementsIHasDeclarations(obj)) {
        for (const declaration of obj.declarations) {
          if (declaration instanceof O.OSignal) {
            if (obj instanceof O.OType && (obj.protected || obj.protectedBody)) {
              this.pushNotAllowed(obj, 'signal declaration');
            }
            if (obj instanceof O.OPackageBody || obj instanceof O.OConfiguration || obj instanceof O.OProcess || obj instanceof O.OSubprogram) {
              this.pushNotAllowed(obj, 'signal declaration');
            }
          } else if (declaration instanceof O.OConstant) {
            if (obj instanceof O.OType && obj.protected ) {
              this.pushNotAllowed(obj, 'constant declaration');
            }
            if (obj instanceof O.OConfiguration) {
              this.pushNotAllowed(obj, 'constant declaration');
            }
          } else if (declaration instanceof O.OVariable) {
            if (obj instanceof O.OType && obj.protected) {
              this.pushNotAllowed(obj, '(shared) variable declaration');
            }
            if (obj instanceof O.OConfiguration) {
              this.pushNotAllowed(obj, '(shared) variable declaration');
            }
            if (!declaration.shared && (obj instanceof O.OEntity || obj instanceof O.OArchitecture)) {
              this.pushNotAllowed(obj, 'variable declaration');
            }
            if (declaration.shared && (obj instanceof O.OProcess || obj instanceof O.OSubprogram)) {
              this.pushNotAllowed(obj, 'shared variable declaration');
            }
            if (declaration.shared && obj instanceof O.OType && obj.protectedBody) {
              this.pushNotAllowed(obj, 'shared variable declaration');
            }
          } else if (declaration instanceof O.OAttributeDeclaration) {
            if (obj instanceof O.OType && obj.protected) {
              this.pushNotAllowed(obj, 'attribute declaration');
            }
            if (obj instanceof O.OConfiguration) {
              this.pushNotAllowed(obj, 'attribute declaration');
            }
          } else if (declaration instanceof O.OType) {
            if (obj instanceof O.OType && obj.protected) {
              this.pushNotAllowed(obj, 'type declaration');
            }
            if (obj instanceof O.OConfiguration) {
              this.pushNotAllowed(obj, 'type declaration');
            }
          } else if (declaration instanceof O.OSubType) {
            if (obj instanceof O.OType && obj.protected) {
              this.pushNotAllowed(obj, 'subtype declaration');
            }
            if (obj instanceof O.OConfiguration) {
              this.pushNotAllowed(obj, 'subtype declaration');
            }
          } else if (declaration instanceof O.OAlias) {
            if (obj instanceof O.OType && obj.protected) {
              this.pushNotAllowed(obj, 'alias declaration');
            }
            if (obj instanceof O.OConfiguration) {
              this.pushNotAllowed(obj, 'alias declaration');
            }
          } else if (declaration instanceof O.OPackageInstantiation) {
            if (obj instanceof O.OType && obj.protected) {
              this.pushNotAllowed(obj, 'package instantiation');
            }
            if (obj instanceof O.OConfiguration) {
              this.pushNotAllowed(obj, 'package instantiation');
            }
          } else if (declaration instanceof O.OComponent) {
            if (obj instanceof O.OEntity
              || obj instanceof O.OPackageBody
              || obj instanceof O.OProcess
              || obj instanceof O.OSubprogram
              || obj instanceof O.OConfiguration
              || obj instanceof O.OType) {
              this.pushNotAllowed(obj, 'component declaration');
            }
          } else if (declaration instanceof O.OSubprogram && declaration.hasBody) {
            if (obj instanceof O.OPackage || obj instanceof O.OConfiguration || (obj instanceof O.OType && obj.protected)) {
              this.pushNotAllowed(obj, 'subprogram body');
            }
          } else if (declaration instanceof O.OFileVariable) {
            if (obj instanceof O.OType && obj.protected) {
              this.pushNotAllowed(obj, 'file variable');
            }
            if (obj instanceof O.OConfiguration) {
              this.pushNotAllowed(obj, 'file variable');
            }
          }
        }
      }
    }
  }
}