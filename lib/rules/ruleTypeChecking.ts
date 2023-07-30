import { implementsIHasSubTypeIndication } from "../parser/interfaces";
import { OArray, OInterfacePackage, OLibrary, OName, OPackage, OSelectedName } from "../objects/objectsIndex";
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
      message: `'${typeName.nameToken.text}' is a ${type} and can not be used as a type.`,
      range: typeName.range
    });
  }
  check() {
    for (const obj of this.file.objectList) {
      if (implementsIHasSubTypeIndication(obj)) {
        const typeNames = cleanSelectedName(obj.subtypeIndication.typeNames);
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
      if (obj instanceof OArray) {
        const indexNames = cleanSelectedName(obj.indexNames);
        if (indexNames.length === 1) { // If there is more found we are not able to resolve
          const indexName = indexNames[0]!;
          if (indexName.definitions.some(definition => definition instanceof OLibrary)) {
            this.generateError(indexName, 'library');
          }
          if (indexName.definitions.some(definition => definition instanceof OPackage)) {
            this.generateError(indexName, 'package');
          }
        }

      }
    }
  }
}