import { RuleBase, IRule } from "./rules-base";
import { DiagnosticSeverity } from "vscode-languageserver";
import { implementsIHasLibraryReference, implementsIHasLibraries } from "../parser/interfaces";
import { OFile, scope } from "../parser/objects";

export class RLibraryReference extends RuleBase implements IRule {
  public static ruleName = 'library-reference';
  file: OFile;

  check() {
    for (const object of this.file.objectList) {
      if (implementsIHasLibraryReference(object) && object.library !== undefined) {
        const libraryReference = object.library;
        let library;
        for (const [iterator] of scope(object)) {
          library = implementsIHasLibraries(iterator) ?
            iterator.libraries.find(library => library.lexerToken.getLText() === libraryReference.referenceToken.getLText()) : undefined;
          if (library) {
            break;
          }
        }
        if (library === undefined) {
          this.addMessage({
            range: object.library.range,
            severity: DiagnosticSeverity.Error,
            message: `Library ${object.library.referenceToken.text} not declared.`
          });
        }
      }
    }
  }
  }