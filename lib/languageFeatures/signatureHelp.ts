import { Position, SignatureHelp, SignatureInformation } from "vscode-languageserver";
import { IHasDefinitions, implementsIHasDefinitions } from "../parser/interfaces";
import { OAliasWithSignature, OAssociationList, ObjectBase, OEntity, OFile, OInstantiation, OSubprogram } from "../parser/objects";
import { VhdlLinter } from "../vhdl-linter";
import { findObjectFromPosition } from "./findObjectFromPosition";

export async function signatureHelp(linter: VhdlLinter, position: Position): Promise<SignatureHelp | null> {
  const object = findObjectFromPosition(linter, position)[0];
  let iterator = object;
  let associationList: OAssociationList | undefined;
  // Find Parent that is defined by a subprogram (instantiation)
  iteratorLoop: while (iterator instanceof OFile === false) {
    if (iterator instanceof OAssociationList) {
      associationList = iterator;
    }
    if (implementsIHasDefinitions(iterator)) {
      for (const definition of iterator.definitions) {
        if (definition instanceof OSubprogram || definition instanceof OEntity) {
          break iteratorLoop;
        }
      }
    }

    if (iterator.parent instanceof OFile) {
      return null;
    }
    iterator = iterator.parent;
  }
  const signatures: SignatureInformation[] = [];
  if (iterator instanceof OInstantiation) {
    for (const definition of iterator.definitions) {
      if (definition instanceof OAliasWithSignature) {
        // Handle AliasWIthSignatures
      } else {
        if (definition.ports.length === 0) {
          signatures.push({
            label: ''
          });
        } else {
          const text = definition.ports[0].range.copyWithNewEnd(definition.ports[definition.ports.length - 1].range).getText();
          let activeParameter = 0;
          if (associationList) {
            // Find active parameter
            // If in range of association via number
            const posI = linter.getIFromPosition(position);
            const associationIndex = associationList.children.findIndex(association => association.range.start.i <= posI && association.range.end.i >= posI);
            console.log(associationIndex)
            if (associationIndex > -1) {
              const association = associationList.children[associationIndex];
              if (association.formalPart.length > 0) {
                for (const formal of association.formalPart) {
                  for (const [portIndex, port] of definition.ports.entries()) {
                    if (port.lexerToken.getLText() === formal.referenceToken.getLText()) {
                      activeParameter = portIndex;
                    }
                  }
                }
              } else {
                activeParameter = associationIndex;
              }
            } else {
              for (const [childNumber, child] of associationList.children.entries()) {
                console.log(childNumber, child.range.end.line, child.range.end.character, child.range.end.i, posI);
                if (posI > child.range.end.i) {
                  activeParameter = childNumber + 1;
                }
              }

            }
          }
          console.log(object.constructor.name);

          signatures.push({
            label: text,
            parameters: definition.ports.map(port => ({
              label: port.range.getText()
            })),
            activeParameter
          });
        }

      }
    }
  }


  for (const definition of (iterator as (ObjectBase & IHasDefinitions)).definitions) {

    if (definition instanceof OSubprogram) {
      if (definition.ports.length === 0) {
        signatures.push({
          label: ''
        });
      } else {
        const startI = definition.ports[0].range.start.i
        const text = linter.text.substring(startI, definition.ports[definition.ports.length - 1].range.end.i);
        signatures.push({
          label: text,
          parameters: definition.ports.map(port => ({
            label: [port.range.start.i - startI, port.range.end.i - startI]
          }))
        });
      }
    }
  }
  return {
    signatures
  };
}