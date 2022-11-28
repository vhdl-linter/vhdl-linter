import { implementsIReferencable, OAlias, OFile, OPackage } from "../parser/objects";
import { ProjectParser } from "../project-parser";
import { getEntities } from "./elaborate-instantiations";

export function elaborateAliases(file: OFile) {
  for (const alias of file.objectList) {
    if (alias instanceof OAlias) {
      alias.aliasDefinitions = alias.name[0].definitions;
      for (const read of alias.name[0].definitions) {
        if (implementsIReferencable(read)) {
          read.aliasReferences.push(alias);
        }
      }
    }
  }

}