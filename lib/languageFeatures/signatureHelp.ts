import { MarkupKind, Position, SignatureHelp, SignatureInformation } from "vscode-languageserver";
import { implementsIHasGenerics } from "../parser/interfaces";
import { OAliasWithSignature, OGenericAssociationList } from "../parser/objects";
import { VhdlLinter } from "../vhdl-linter";
import { findParentInstantiation } from "./helper/findParentInstantiation";
export function signatureHelp(linter: VhdlLinter, position: Position): SignatureHelp | null {
  const result = findParentInstantiation(linter, position);
  if (!result) {
    return null;
  }
  const [instantiation, associationList] = result;
  const signatures: SignatureInformation[] = [];
  for (const definition of instantiation.definitions) {
    if (definition instanceof OAliasWithSignature) {
      // Handle AliasWIthSignatures
    } else {
      const portOrGeneric = associationList instanceof OGenericAssociationList && implementsIHasGenerics(definition) ? definition.generics : definition.ports;
      if (portOrGeneric.length === 0) {
        signatures.push({
          label: ''
        });
      } else {
        // Skip definitions with less ports
        if (portOrGeneric.length < (associationList?.children.length ?? 0)) {
          continue;
        }
        const text = portOrGeneric.map(port => port.lexerToken.text).join(', ');
        let activeParameter;
        if (associationList) {
          // Find active parameter
          // If in range of association via number
          const posI = linter.getIFromPosition(position);
          const associationIndex = associationList.children.findIndex(association => association.range.start.i <= posI && association.range.end.i >= posI);
          const association = associationList.children[associationIndex];
          if (associationIndex > -1 && association && association.formalPart.length > 0) {
            for (const formal of association.formalPart) {
              for (const [portIndex, port] of portOrGeneric.entries()) {
                if (port.lexerToken.getLText() === formal.referenceToken.getLText()) {
                  activeParameter = portIndex;
                }
              }
            }
            // If not found set outside of range.
            // LSP standard is not complete on this.
            // This might be hacky, client maybe supposed to reset to zero anyways. But works in vscode
            if (activeParameter === undefined) {
              activeParameter = portOrGeneric.length;
            }
          } else {
            activeParameter = 0;
            for (const [childNumber, child] of associationList.children.entries()) {
              // Extend the end range by white spaces (assume it belongs to the association if cursor is in whitespace)
              let tokenIndex = linter.file.lexerTokens.findIndex(token => token.range.end.i === child.range.end.i);
              while (linter.file.lexerTokens[tokenIndex + 1]?.isWhitespace()) {
                tokenIndex++;
              }
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              if (posI >= (linter.file.lexerTokens[tokenIndex]!.range.end.i)) {
                activeParameter = childNumber + 1;
              }
            }

          }
        }

        signatures.push({
          label: text,
          parameters: portOrGeneric.map(port => ({
            label: port.lexerToken.text,
            documentation: {
              kind: MarkupKind.Markdown,
              value: '```vhdl\n' + port.range.getText().replaceAll(/\s+/g, ' ') + '\n```'
            }
          })),
          activeParameter
        });
      }

    }
  }


  return {
    signatures
  };
}