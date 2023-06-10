import * as O from "../parser/objects";
import { VhdlLinter } from "../vhdlLinter";

export function elaborateInstantiations(vhdlLinter: VhdlLinter) {
  for (const obj of vhdlLinter.file.objectList) {
    if (obj instanceof O.OInstantiation) {
      const defs = obj.instantiatedUnit.at(-1)!.definitions;
      switch (obj.type) {
      case 'entity':
        obj.definitions.set(obj.instantiatedUnit.at(-1)!.rootFile.uri, defs.filter(def => def instanceof O.OEntity) as O.OEntity[]);
        break;
      case 'component':
        obj.definitions.set(obj.instantiatedUnit.at(-1)!.rootFile.uri, defs.filter(def => def instanceof O.OComponent) as O.OComponent[]);
        break;
      case 'subprogram':
        obj.definitions.set(obj.instantiatedUnit.at(-1)!.rootFile.uri, defs.filter(def => def instanceof O.OSubprogram || def instanceof O.OAliasWithSignature) as (O.OSubprogram | O.OAliasWithSignature)[]);
        break;
      case 'configuration':
        obj.definitions.set(obj.instantiatedUnit.at(-1)!.rootFile.uri, defs.filter(def => def instanceof O.OConfigurationDeclaration) as O.OConfigurationDeclaration[]);
        break;
      case 'unknown':
        obj.definitions.set(obj.instantiatedUnit.at(-1)!.rootFile.uri, defs.get().slice(0) as ((O.OEntity | O.OSubprogram | O.OComponent | O.OAliasWithSignature | O.OConfigurationDeclaration)[]));
        break;
      }
      for (const def of obj.definitions.it()) {
        def.nameLinks.push(obj);
      }
    } else if (obj instanceof O.OPackageInstantiation || obj instanceof O.OInterfacePackage) {
      const defs = obj.uninstantiatedPackage.at(-1)!.definitions;
      obj.definitions.set(obj.uninstantiatedPackage.at(-1)!.rootFile.uri, defs.filter(def => def instanceof O.OPackage) as O.OPackage[]);
      for (const def of obj.definitions.it()) {
        def.nameLinks.push(obj.uninstantiatedPackage.at(-1)!);
      }
    }
  }
}