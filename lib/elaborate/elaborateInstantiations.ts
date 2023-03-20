import * as O from "../parser/objects";
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
      }
    }
  }
}