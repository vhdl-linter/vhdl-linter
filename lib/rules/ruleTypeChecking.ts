import { implementsIHasTypeNames } from "../parser/interfaces";
import { OInterfacePackage, OLibrary, OName, OPackage, OSelectedName, OUseClause } from "../parser/objects";
import { IRule, RuleBase } from "./rulesBase";
// For select Name array get only the last
function cleanSelectedName(names: OName[]) {
  return names.filter((name, i) => {
    const next = names[i + 1];
    return (next instanceof OSelectedName && next.prefixTokens.includes(name)) === false;
  });
}
export class RuleTypeChecking extends RuleBase implements IRule {
  public static readonly ruleName = 'type-checking';
  generateError(typeName: OName, type: string) {
    this.addMessage({
      message: `'${typeName.nameToken.text}'  is a ${type} can not be used as a type`,
      range: typeName.range
    });
  }
  check() {
    for (const obj of this.file.objectList) {
      if (implementsIHasTypeNames(obj)) {
        const typeNames = cleanSelectedName(obj.typeNames);
        if (typeNames.length === 1) { // If there is more found we are not able to resolve
          const typeName = typeNames[0]!;
          if (typeName.definitions.some(definition => definition instanceof OLibrary)) {
            this.generateError(typeName, 'library');
          }
          if (typeName.definitions.some(definition => definition instanceof OPackage)) {
            this.generateError(typeName, 'package');
          }
        }
      }
      if (obj instanceof OInterfacePackage) {
        const typeNames = cleanSelectedName(obj.uninstantiatedPackage);
        if (typeNames.length === 1) { // If there is more found we are not able to resolve
          const typeName = typeNames[0]!;
          if (typeName.definitions.some(definition => definition instanceof OPackage === false)) {
            this.addMessage({
              message: `'${typeName.nameToken.text}' is not a package!`,
              range: typeName.range
            });
          }
        }
      }
    }
  }
}