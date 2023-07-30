import * as O from "../objects/objectsIndex";
import { VhdlLinter } from "../vhdlLinter";

export function elaborateInstantiations(vhdlLinter: VhdlLinter) {
  for (const obj of vhdlLinter.file.objectList) {
    if (obj instanceof O.OInstantiation) {
      const defs = obj.instantiatedUnit.at(-1)!.definitions;
      switch (obj.type) {
      case 'entity':
        obj.definitions = defs.filter(def => def instanceof O.OEntity) as O.OEntity[];
        break;
      case 'component':
        obj.definitions = defs.filter(def => def instanceof O.OComponent) as O.OComponent[];
        break;
      case 'subprogram':
        obj.definitions = defs.filter(def => def instanceof O.OSubprogram || def instanceof O.OAliasWithSignature) as (O.OSubprogram | O.OAliasWithSignature)[];
        break;
      case 'configuration':
        obj.definitions = defs.filter(def => def instanceof O.OConfigurationDeclaration) as O.OConfigurationDeclaration[];
        break;
      case 'unknown':
        obj.definitions = defs.slice(0) as (typeof obj.definitions);
        break;
      }
      for (const def of obj.definitions) {
        def.nameLinks.push(obj);
      }
    } else if (obj instanceof O.OPackageInstantiation || obj instanceof O.OInterfacePackage) {
      const defs = obj.uninstantiatedPackage.at(-1)!.definitions;
      obj.definitions = defs.filter(def => def instanceof O.OPackage) as O.OPackage[];
      for (const def of obj.definitions) {
        def.nameLinks.push(obj.uninstantiatedPackage.at(-1)!);
      }
    }
  }
}