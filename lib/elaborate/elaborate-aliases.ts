import { implementsIHasReference } from "../parser/interfaces";
import { OAlias, OFile, ParserError } from "../parser/objects";

export function elaborateAliases(file: OFile) {
  for (const alias of file.objectList) {
    if (alias instanceof OAlias) {
      if (alias.name.length === 0) {
        throw new ParserError(`Alias without name`, alias.range); // TODO: change the parser error to addMessage
      }
      alias.aliasDefinitions = alias.name[0].definitions;
      for (const read of alias.name[0].definitions) {
        if (implementsIHasReference(read)) {
          read.aliasReferences.push(alias);
        }
      }
    }
  }

}