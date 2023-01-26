import { implementsIHasTypeReference } from "../parser/interfaces";
import { OFile, ORecord, OSelectedName, OSelectedNameRead, OSelectedNameWrite } from "../parser/objects";

export function elaborateSelectedNames(file: OFile) {
  for (const selectedName of file.objectList) {
    if (selectedName instanceof OSelectedNameRead || selectedName instanceof OSelectedNameWrite || selectedName instanceof OSelectedName) {
      const oldDefinitions = selectedName.definitions;
      selectedName.definitions = [];
      // search through the types to find a recordType to find children which match the referenceToken
      for (const oldDef of oldDefinitions) {
        if (implementsIHasTypeReference(oldDef)) {
          for (const typeDef of oldDef.typeReference.flatMap(r => r.definitions)) {
            if (typeDef instanceof ORecord) {
              for (const child of typeDef.children) {
                if (child.lexerToken.getLText() === selectedName.referenceToken.getLText()) {
                  selectedName.definitions.push(child);
                }
              }
            }
          }
        }
      }
      // if no better definitions were found, restore the old
      // TODO: improve this to also find recursive records or arrays of records, etc.
      if (selectedName.definitions.length === 0) {
        selectedName.definitions = oldDefinitions;
      }
    }
  }

}