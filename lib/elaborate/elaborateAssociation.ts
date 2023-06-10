import * as I from "../parser/interfaces";
import * as O from "../parser/objects";
// elaborate association deletes the wrong actualIfInput/actualIfOutput/actualIfInOut
export function elaborateAssociations(file: O.OFile) {
  for (const association of file.objectList.filter(obj => obj instanceof O.OAssociation) as O.OAssociation[]) {
    // converted instantiations are always functions therefore have only inputs
    if (association.parent.parent instanceof O.OInstantiation && association.parent.parent.convertedInstantiation) {
      continue;
    }
    if (association.parent instanceof O.OGenericAssociationList || association.parent instanceof O.OPortAssociationList) {
      const definitions = association.parent.parent.definitions;

      const possibleFormals: (O.OPort | O.OGeneric | O.OTypeMark)[] = [];
      possibleFormals.push(...definitions.flatMap(definition => {
        let elements: (O.OPort | O.OGeneric | O.OTypeMark)[] = [];
        if (definition instanceof O.OVariable) {
          // Protected Type
        } else if (association.parent instanceof O.OPortAssociationList) {
          if (definition instanceof O.OAliasWithSignature) {
            elements = definition.typeMarks;
          } else if (definition instanceof O.OConfigurationDeclaration) {
            elements = definition.definitions.get(0)?.ports ?? [];
          } else if (I.implementsIHasPorts(definition)) {
            elements = definition.ports;
          }
        } else if (I.implementsIHasGenerics(definition)) {
          elements = definition.generics;
        }
        return elements.filter((port, portNumber) => {
          if (!(port instanceof O.OTypeMark)) {
            // Handle Casting
            const formalPartChildren = association.formalPart.map(O.getTheInnermostNameChildren);
            const formalMatch = formalPartChildren.find(name => name.nameToken.getLText() === port.lexerToken.getLText());
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
      association.definitions.add(file.uri, possibleFormals);
      for (const formalPart of association.formalPart) {
        formalPart.definitions.add(file.uri, possibleFormals);
      }
      if (definitions.length === 1) {
        for (const possibleFormal of possibleFormals) {
          elaborateAssociationMentionables(possibleFormal, association, file);
        }
      }
    }
  }
}
function elaborateAssociationMentionables(possibleFormal: O.OPort | O.OGeneric | O.OTypeMark, association: O.OAssociation, file: O.OFile) {
  if (possibleFormal instanceof O.OPort) {
    if (possibleFormal.direction === 'in') {
      for (const mapping of association.actualIfOutput.flat()) {
        const index = file.objectList.indexOf(mapping);
        file.objectList.splice(index, 1);
        for (const mentionable of file.objectList) {
          if (I.implementsIHasNameLinks(mentionable)) {
            for (const [index, mention] of mentionable.nameLinks.entries()) {
              if (mention === mapping) {
                mentionable.nameLinks.splice(index, 1);
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
          if (I.implementsIHasNameLinks(mentionable)) {
            for (const [index, mention] of mentionable.nameLinks.entries()) {
              if (mention === mapping) {
                mentionable.nameLinks.splice(index, 1);
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
          if (I.implementsIHasNameLinks(mentionable)) {
            for (const [index, mention] of mentionable.nameLinks.entries()) {
              if (mention === mapping) {
                mentionable.nameLinks.splice(index, 1);
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
          if (I.implementsIHasNameLinks(mentionable)) {
            for (const [index, mention] of mentionable.nameLinks.entries()) {
              if (mention === mapping) {
                mentionable.nameLinks.splice(index, 1);
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
          if (I.implementsIHasNameLinks(mentionable)) {
            for (const [index, mention] of mentionable.nameLinks.entries()) {
              if (mention === mapping) {
                mentionable.nameLinks.splice(index, 1);
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
          if (I.implementsIHasNameLinks(mentionable)) {
            for (const [index, mention] of mentionable.nameLinks.entries()) {
              if (mention === mapping) {
                mentionable.nameLinks.splice(index, 1);
              }
            }
          }
        }
      }
      association.actualIfOutput = [];
    }
  }
}