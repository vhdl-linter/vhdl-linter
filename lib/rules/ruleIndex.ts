import { RuleComponent } from "./ruleComponents";
import { RuleConfiguration } from "./ruleConfiguration";
import { RuleConstantWrite } from "./ruleConstantWrite";
import { RuleEmpty } from "./ruleEmpty";
import { RuleInstantiation } from "./ruleInstantiations";
import { RuleLibrary } from "./ruleLibrary";
import { RuleLibraryReference } from "./ruleLibraryReferences";
import { RuleMultipleDefinition } from "./ruleMultipleDefinitions";
import { RuleNotAllowed } from "./ruleNotAllowed";
import { RuleNotDeclared } from "./ruleNotDeclared";
import { RuleParser } from "./ruleParser";
import { RuleTypeChecking } from "./ruleTypeChecking";
import { RuleNamingStyle } from "./ruleNamingStyle";
import { RuleTypeResolved } from "./ruleTypeResolved";
import { RuleUnits } from "./ruleUnits";
import { RuleUnused } from "./ruleUnused";

export const rules = [
  RuleComponent,
  RuleInstantiation,
  RuleLibrary,
  RuleLibraryReference,
  RuleMultipleDefinition,
  RuleNotDeclared,
  RuleNamingStyle,
  RuleTypeResolved,
  RuleUnused,
  RuleEmpty,
  RuleConstantWrite,
  RuleParser,
  RuleUnits,
  RuleConfiguration,
  RuleNotAllowed,
  RuleTypeChecking
];