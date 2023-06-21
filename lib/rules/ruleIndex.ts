import { RuleComponent } from "./ruleComponents";
import { RuleConfiguration } from "./ruleConfiguration";
import { RuleConstantWrite } from "./ruleConstantWrite";
import { RuleEmpty } from "./ruleEmpty";
import { RuleInstantiation } from "./ruleInstantiations";
import { RuleLibrary } from "./ruleLibrary";
import { RuleMultipleDefinition } from "./ruleMultipleDefinitions";
import { RuleNotAllowed } from "./ruleNotAllowed";
import { RuleNotDeclared } from "./ruleNotDeclared";
import { RuleParser } from "./ruleParser";
import { RuleTypeChecking } from "./ruleTypeChecking";
import { RuleNamingStyle } from "./ruleNamingStyle";
import { RuleTypeResolved } from "./ruleTypeResolved";
import { RuleUnits } from "./ruleUnits";
import { RuleUnused } from "./ruleUnused";
import { RuleUseClause } from "./ruleUseClause";
import { RuleCodingStyle } from "./ruleCodingStyle";
import { RuleCasingStyle } from "./ruleCasingStyle";
import { RuleConsistentCasing } from "./ruleConsistentCasing";
import { RuleOrder } from "./ruleOrder";

export const rules = [
  RuleComponent,
  RuleInstantiation,
  RuleLibrary,
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
  RuleTypeChecking,
  RuleUseClause,
  RuleCodingStyle,
  RuleCasingStyle,
  RuleConsistentCasing,
  RuleOrder
];