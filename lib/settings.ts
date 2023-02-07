import { DeepPartial } from 'utility-types';
export interface ISettings {
  ports: {
    outRegex: string;
    inRegex: string;
    enablePortStyle: boolean;
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
    warnLibrary: boolean;
    warnLogicType: boolean;
    warnMultipleDriver: boolean;
  };
  semanticTokens: boolean;
}
export const defaultSettings: ISettings = {
  ports: {
    outRegex: '^o_',
    inRegex: '^i_',
    enablePortStyle: true,
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
    warnLogicType: true,
    warnLibrary: false,
    warnMultipleDriver: false
  },
  semanticTokens: false
};
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