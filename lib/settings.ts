import { DeepPartial } from 'utility-types';
import { rules } from './rules/rule-index';

const ruleNames = rules.map(r => r.ruleName);
export interface ISettings {
  ports: {
    outRegex: string;
    inRegex: string;
  };
  paths: {
    additional: string[];
    ignoreRegex: string;
  };
  style: {
    preferredLogicTypePort: "unresolved" | "resolved" | "ignore";
    preferredLogicTypeSignal: "unresolved" | "resolved" | "ignore";
    unusedSignalRegex: string;
    ieeeCasing: 'lowercase' | 'UPPERCASE';
  };
  rules: {
    'component': boolean;
    'instantiation': boolean;
    'library': boolean;
    'library-reference': boolean;
    'multiple-definition': boolean;
    'not-declared': boolean;
    'port-declaration': boolean;
    'type-resolved': boolean;
    'unused': boolean;
    'empty': boolean;
    'constant-write': boolean;
    'parser': boolean;
    'unit': boolean;
    'multiple-driver': boolean;
  } // Can this be automated? `typeof ruleNames[number]` as in https://stackoverflow.com/a/55505556 does not work because ruleNames cannot be `as const`
  semanticTokens: boolean;
}
// Verify the rules array on start
function verifyRulesType(settings: ISettings) {
  for (const ruleName of ruleNames) {
    if (!Object.keys(settings.rules).includes(ruleName)) {
      throw new Error(`The settings do not include rule '${ruleName}'`);
    }
  }
  for (const rule of Object.keys(settings.rules)) {
    if (!ruleNames.includes(rule)) {
      throw new Error(`The settings include an unknown rule '${rule}'`);
    }
  }
  return settings;
}

export const defaultSettings: ISettings = verifyRulesType({
  ports: {
    outRegex: '^o_',
    inRegex: '^i_',
  },
  paths: {
    additional: [],
    ignoreRegex: ''
  },
  style: {
    preferredLogicTypePort: 'unresolved',
    preferredLogicTypeSignal: 'unresolved',
    unusedSignalRegex: '_unused$',
    ieeeCasing: 'lowercase'
  },
  rules: {
    'component': true,
    'instantiation': true,
    'library': false,
    'library-reference': true,
    'multiple-definition': true,
    'not-declared': true,
    'port-declaration': true,
    'type-resolved': true,
    'unused': true,
    'empty': true,
    'constant-write': true,
    'parser': true,
    'unit': true,
    'multiple-driver': false
  },
  semanticTokens: false
});



export function defaultSettingsGetter() {
  return defaultSettings;
}
export function defaultSettingsWithOverwrite(overwrite?: DeepPartial<ISettings>) {
  const newDefault = JSON.parse(JSON.stringify(defaultSettings)) as ISettings;

  if (overwrite) {
    recursiveObjectAssign(newDefault, overwrite);
  }
  return () => newDefault;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function recursiveObjectAssign<T extends Record<string, any>>(target: T, source: DeepPartial<T>) {
  Object.keys(source).forEach(key => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const s_val = source[key];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const t_val = target[key];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    (target as any)[key] = t_val && s_val && typeof t_val === 'object' && typeof s_val === 'object'
      ? recursiveObjectAssign(t_val, s_val)
      : s_val;
  });
  return target;
}