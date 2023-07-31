import { _interface } from './generateSettings';
import { rules } from '../lib/rules/ruleIndex';

// Check rules
const rulesInInterface = _interface?.rules;
if (typeof rulesInInterface !== 'object' || Array.isArray(rulesInInterface)) {
  throw new Error('No rules path found!');
}
for (const rule of rules) {
  if (rulesInInterface[rule.ruleName] === undefined) {
    throw new Error(`Did not find rule ${rule.ruleName} in settings`);
  }
}