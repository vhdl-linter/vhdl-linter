import { RComponent } from "./components";
import { RConstantWrite } from "./constant-write";
import { REmpty } from "./empty";
import { RInstantiation } from "./instantions";
import { RLibrary } from "./library";
import { RLibraryReference } from "./library-references";
import { RMultipleDefinition } from "./multiple-definitions";
import { RNotDeclared } from "./not-declared";
import { RParser } from "./parser";
import { RPortDeclaration } from "./port-declaration";
import { RPortType } from "./port-type";
import { RUnused } from "./unused";

export const rules = [
  RComponent,
  RInstantiation,
  RLibrary,
  RLibraryReference,
  RMultipleDefinition,
  RNotDeclared,
  RPortDeclaration,
  RPortType,
  RUnused,
  REmpty,
  RConstantWrite,
  RParser
];