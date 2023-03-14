import { implementsIHasNameLinks } from "../parser/interfaces";
import { OAlias, OFile } from "../parser/objects";

export function elaborateAliases(file: OFile) {
  for (const alias of file.objectList) {
    if (alias instanceof OAlias) {
      const lastName = alias.name[alias.name.length - 1];
      if (lastName) { // No Name is throwing an an error in parser but no fatal
        alias.aliasDefinitions = lastName.definitions;
        for (const read of lastName.definitions) {
          if (implementsIHasNameLinks(read)) {
            read.aliasLinks.push(alias);
          }
        }
      }
    }
  }

}