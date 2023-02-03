import { Position, SignatureHelp, SignatureInformation } from "vscode-languageserver";
import { IHasDefinitions, implementsIHasDefinitions } from "../parser/interfaces";
import { ObjectBase, OFile, OInstantiation, OSubprogram } from "../parser/objects";
import { VhdlLinter } from "../vhdl-linter";
import { findObjectFromPosition } from "./findObjectFromPosition";

export async function signatureHelp(vhdlLinter: VhdlLinter, position: Position): Promise<SignatureHelp | null> {
  const object = findObjectFromPosition(vhdlLinter, position)[0];
  let iterator = object;
  // Find Parent that is defined by a subprogram (instantiation)
  iteratorLoop: while (iterator instanceof OFile === false) {
    if (implementsIHasDefinitions(iterator)) {
      for (const definition of iterator.definitions) {
        if (definition instanceof OSubprogram) {
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
  for (const definition of (iterator as (ObjectBase & IHasDefinitions)).definitions) {
    if (definition instanceof OSubprogram) {
      if (definition.ports.length === 0) {
        signatures.push({
          label: ''
        });
      } else {
        const startI = definition.ports[0].range.start.i
        const text = vhdlLinter.text.substring(startI, definition.ports[definition.ports.length - 1].range.end.i);
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