import { RComponent } from "./components";
import { RConstantWrite } from "./constant-write";
import { REmpty } from "./empty";
import { RInstantiation } from "./instantiations";
import { RLibrary } from "./library";
import { RLibraryReference } from "./library-references";
import { RMultipleDefinition } from "./multiple-definitions";
import { RNotDeclared } from "./not-declared";
import { RParser } from "./parser";
import { RPortDeclaration } from "./port-declaration";
import { RTypeResolved } from "./type-resolved";
import { RUnits } from "./units";
import { RUnused } from "./unused";

export const rules = [
  RComponent,
  RInstantiation,
  RLibrary,
  RLibraryReference,
  RMultipleDefinition,
  RNotDeclared,
  RPortDeclaration,
  RTypeResolved,
  RUnused,
  REmpty,
  RConstantWrite,
  RParser,
  RUnits
];