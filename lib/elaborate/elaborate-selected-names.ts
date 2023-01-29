import { implementsIHasReference, implementsIHasTypeReference } from "../parser/interfaces";
import { OArray, ObjectBase, OFile, ORecord, OSelectedName, OSelectedNameRead, OSelectedNameWrite } from "../parser/objects";

function findRecordElement(selectedName: OSelectedName | OSelectedNameWrite | OSelectedNameRead, typeDefinition: ObjectBase) {
  if (typeDefinition instanceof ORecord) {
    for (const child of typeDefinition.children) {
      if (child.lexerToken.getLText() === selectedName.referenceToken.getLText()) {
        selectedName.definitions.push(child);
      }
    }
  } else if (typeDefinition instanceof OArray) {
    for (const def of typeDefinition.elementType.flatMap(r => r.definitions)) {
      findRecordElement(selectedName, def);
    }
  }
}

export function elaborateSelectedNames(file: OFile) {
  for (const selectedName of file.objectList) {
    if (selectedName instanceof OSelectedNameRead || selectedName instanceof OSelectedNameWrite || selectedName instanceof OSelectedName) {
      const oldDefinitions = selectedName.definitions;
      selectedName.definitions = [];
      // search through the types to find a recordType to find children which match the referenceToken
      for (const oldDef of oldDefinitions) {
        if (implementsIHasReference(oldDef)) {
          // remove the reference on this selectedName
          oldDef.referenceLinks = oldDef.referenceLinks.filter(r => r !== selectedName);
        }
        if (implementsIHasTypeReference(oldDef)) {
          for (const typeDef of oldDef.typeReference.flatMap(r => r.definitions)) {
            findRecordElement(selectedName, typeDef);
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