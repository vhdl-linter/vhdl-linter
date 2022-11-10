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
    preferedLogicType: 'std_logic' | 'std_ulogic';
    unusedSignalRegex: string;
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
    preferedLogicType: 'std_ulogic',
    unusedSignalRegex: '_unused$'
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