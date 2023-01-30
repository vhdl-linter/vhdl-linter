import { implementsIHasReference } from "../parser/interfaces";
import { OAlias, OFile } from "../parser/objects";

export function elaborateAliases(file: OFile) {
  for (const alias of file.objectList) {
    if (alias instanceof OAlias) {
      if (alias.name.length > 0) { // No Name is throwing an an error in parser but no fatal
        alias.aliasDefinitions = alias.name[alias.name.length - 1].definitions;
        for (const read of alias.name[alias.name.length - 1].definitions) {
          if (implementsIHasReference(read)) {
            read.aliasReferences.push(alias);
          }
        }
      }
    }
  }

}