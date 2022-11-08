import { RComponent } from "./components";
import { RInstantiation } from "./instantions";
import { RLibrary } from "./library";
import { RLibraryReference } from "./library-references";
import { RMultipleDefinition } from "./multiple-definitions";
import { RNotDeclared } from "./not-declared";
import { RPortDeclaration } from "./port-declaration";
import { RPortType } from "./port-type";
import { RReset } from "./resets";
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
  RReset,
  RUnused
];