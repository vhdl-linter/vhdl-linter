import { implementsIHasReferenceLinks } from "../parser/interfaces";
import { OAliasWithSignature, OAssociation, OComponent, OConfigurationDeclaration, OEntity, OFile, OGeneric, OGenericAssociationList, OInstantiation, OPort, OPortAssociationList, OTypeMark, OVariable } from "../parser/objects";

export function elaborateAssociations(file: OFile) {
  for (const association of file.objectList.filter(obj => obj instanceof OAssociation) as OAssociation[]) {
    if (association.parent instanceof OGenericAssociationList || association.parent instanceof OPortAssociationList) {
      if (!(association.parent.parent instanceof OInstantiation)) {
        continue;
      }
      const definitions = association.parent.parent.definitions;

      const possibleFormals: (OPort | OGeneric | OTypeMark)[] = [];
      possibleFormals.push(...definitions.flatMap(definition => {
        let elements: (OPort | OGeneric | OTypeMark)[] = [];
        if (definition instanceof OVariable) {
          // Protected Type
        } else if (association.parent instanceof OPortAssociationList) {
          if (definition instanceof OAliasWithSignature) {
            elements = definition.typeMarks;
          } else if (definition instanceof OConfigurationDeclaration) {
            elements = definition.definitions[0]?.ports ?? [];
          } else {
            elements = definition.ports;
          }
        } else if (definition instanceof OComponent || definition instanceof OEntity) {
          elements = definition.generics;
        }
        return elements.filter((port, portNumber) => {
          if (!(port instanceof OTypeMark)) {
            const formalMatch = association.formalPart.find(name => name.referenceToken.getLText() === port.lexerToken.getLText());
            if (formalMatch) {
              return true;
            }
          }
          return association.formalPart.length === 0 && portNumber === association.parent.children.findIndex(o => o === association);
        });
      }));

      if (possibleFormals.length === 0) {
        continue;
      }
      association.definitions.push(...possibleFormals);
      for (const formalPart of association.formalPart) {
        formalPart.definitions.push(...possibleFormals);
      }
      if (definitions.length === 1) {
        for (const possibleFormal of possibleFormals) {
          elaborateAssociationMentionables(possibleFormal, association, file);
        }
      }
    }
  }
}
function elaborateAssociationMentionables(possibleFormal: OPort | OGeneric | OTypeMark, association: OAssociation, file: OFile) {
  if (possibleFormal instanceof OPort) {
    if (possibleFormal.direction === 'in') {
      for (const mapping of association.actualIfOutput.flat()) {
        const index = file.objectList.indexOf(mapping);
        file.objectList.splice(index, 1);
        for (const mentionable of file.objectList) {
          if (implementsIHasReferenceLinks(mentionable)) {
            for (const [index, mention] of mentionable.referenceLinks.entries()) {
              if (mention === mapping) {
                mentionable.referenceLinks.splice(index, 1);
              }
            }
          }
        }
      }
      association.actualIfOutput = [];
      for (const mapping of association.actualIfInoutput.flat()) {
        const index = file.objectList.indexOf(mapping);
        file.objectList.splice(index, 1);
        for (const mentionable of file.objectList) {
          if (implementsIHasReferenceLinks(mentionable)) {
            for (const [index, mention] of mentionable.referenceLinks.entries()) {
              if (mention === mapping) {
                mentionable.referenceLinks.splice(index, 1);
              }
            }
          }
        }
      }
      association.actualIfInoutput = [];
    } else if (possibleFormal.direction === 'out') {
      for (const mapping of association.actualIfInput) {
        const index = file.objectList.indexOf(mapping);
        file.objectList.splice(index, 1);
        for (const mentionable of file.objectList) {
          if (implementsIHasReferenceLinks(mentionable)) {
            for (const [index, mention] of mentionable.referenceLinks.entries()) {
              if (mention === mapping) {
                mentionable.referenceLinks.splice(index, 1);
              }
            }
          }
        }
      }
      association.actualIfInput = [];
      for (const mapping of association.actualIfInoutput.flat()) {
        const index = file.objectList.indexOf(mapping);
        file.objectList.splice(index, 1);
        for (const mentionable of file.objectList) {
          if (implementsIHasReferenceLinks(mentionable)) {
            for (const [index, mention] of mentionable.referenceLinks.entries()) {
              if (mention === mapping) {
                mentionable.referenceLinks.splice(index, 1);
              }
            }
          }
        }
      }
      association.actualIfInoutput = [];
    } else if (possibleFormal.direction === 'inout') {
      for (const mapping of association.actualIfInput) {
        const index = file.objectList.indexOf(mapping);
        file.objectList.splice(index, 1);
        for (const mentionable of file.objectList) {
          if (implementsIHasReferenceLinks(mentionable)) {
            for (const [index, mention] of mentionable.referenceLinks.entries()) {
              if (mention === mapping) {
                mentionable.referenceLinks.splice(index, 1);
              }
            }
          }
        }
      }
      association.actualIfInput = [];
      for (const mapping of association.actualIfOutput.flat()) {
        const index = file.objectList.indexOf(mapping);
        file.objectList.splice(index, 1);
        for (const mentionable of file.objectList) {
          if (implementsIHasReferenceLinks(mentionable)) {
            for (const [index, mention] of mentionable.referenceLinks.entries()) {
              if (mention === mapping) {
                mentionable.referenceLinks.splice(index, 1);
              }
            }
          }
        }
      }
      association.actualIfOutput = [];
    }
  }
}