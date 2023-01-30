import { DiagnosticSeverity } from "vscode-languageserver";
import { implementsIHasReference, implementsIHasTypeReference } from "../parser/interfaces";
import { OArray, ObjectBase, OFile, ORecord, ORecordChild, OSelectedName, OSelectedNameRead, OSelectedNameWrite } from "../parser/objects";

function findRecordElement(file: OFile, selectedName: OSelectedName | OSelectedNameWrite | OSelectedNameRead, typeDefinition: ObjectBase) {
  if (typeDefinition instanceof ORecord) {
    let found = false;
    for (const child of typeDefinition.children) {
      if (child.lexerToken.getLText() === selectedName.referenceToken.getLText()) {
        selectedName.definitions.push(child);
        found = true;
      }
    }
    if (found === false) {
      file.parserMessages.push({
        message: `${selectedName.referenceToken} does not exist on record ${typeDefinition.lexerToken}`,
        range: selectedName.referenceToken.range,
        severity: DiagnosticSeverity.Error
      });
    }
  } else if (typeDefinition instanceof OArray) {
    for (const def of typeDefinition.elementType.flatMap(r => r.definitions)) {
      findRecordElement(file, selectedName, def);
    }
  }
}

export function elaborateSelectedNames(file: OFile) {
  for (const selectedName of file.objectList) {
    if (selectedName instanceof OSelectedNameRead || selectedName instanceof OSelectedNameWrite || selectedName instanceof OSelectedName) {
      const oldDefinitions = selectedName.definitions;
      selectedName.definitions = [];
      // TODO: improve the handling of alias in elaborate-selected-name (see OSVVM/CoveragePkg.vhd:2008)
      const lastPrefix = selectedName.prefixTokens[selectedName.prefixTokens.length - 1];
      // check for a record in a record -> if the last prefix was a selected name, search in its type definition and not in the oldDefinitions
      if (lastPrefix instanceof OSelectedName || lastPrefix instanceof OSelectedNameRead || lastPrefix instanceof OSelectedNameWrite) {
        for (const childDefinition of lastPrefix.definitions) {
          if (childDefinition instanceof ORecordChild) {
            for (const typeDef of childDefinition.referenceLinks.flatMap(r => r.definitions)) {
              findRecordElement(file, selectedName, typeDef);
            }
          }
        }
      } else {
        // search through the types to find a recordType to find children which match the referenceToken
        for (const oldDef of oldDefinitions) {
          if (implementsIHasTypeReference(oldDef)) {
            for (const typeDef of oldDef.typeReference.flatMap(r => r.definitions)) {
              findRecordElement(file, selectedName, typeDef);
            }
          }
        }
      }
      // if no better definitions were found, restore the old
      if (selectedName.definitions.length === 0) {
        selectedName.definitions = oldDefinitions;
      } else {
        // update the references on this selectedName
        for (const oldDef of oldDefinitions) {
          if (implementsIHasReference(oldDef)) {
            oldDef.referenceLinks = oldDef.referenceLinks.filter(r => r !== selectedName);
          }
        }
        for (const newDef of selectedName.definitions) {
          if (implementsIHasReference(newDef)) {
            newDef.referenceLinks.push(selectedName);
          }
        }
      }
    }
  }

}