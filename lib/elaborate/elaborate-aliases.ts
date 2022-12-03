import { implementsIHasReference } from "../parser/interfaces";
import { OAlias, OFile } from "../parser/objects";

export function elaborateAliases(file: OFile) {
  for (const alias of file.objectList) {
    if (alias instanceof OAlias) {
      alias.aliasDefinitions = alias.name[0].definitions;
      for (const read of alias.name[0].definitions) {
        if (implementsIHasReference(read)) {
          read.aliasReferences.push(alias);
        }
      }
    }
  }

}