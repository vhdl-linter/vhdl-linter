export interface ISettings {
  'trace': {
    'server': 'off'|'messages'|'verbose';
  };
  'rules': {
    'component': boolean;
    'instantiation': boolean;
    'configuration': boolean;
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
    'not-allowed': boolean;
  };
  'style': {
    'preferredLogicTypePort': 'unresolved'|'resolved'|'ignore';
    'preferredLogicTypeSignal': 'unresolved'|'resolved'|'ignore';
    'preferredLogicTypeRecordChild': 'unresolved'|'resolved'|'ignore';
    'unusedSignalRegex': string;
    'ieeeCasing': 'lowercase'|'UPPERCASE';
    'signalPrefix': string;
    'signalSuffix': string;
    'genericPrefix': string;
    'genericSuffix': string;
    'instantiationLabelPrefix': string;
    'instantiationLabelSuffix': string;
  };
  'ports': {
    'outRegex': string;
    'inRegex': string;
  };
  'paths': {
    'additional': string[];
    'ignoreRegex': string;
  };
  'semanticTokens': boolean;
  'semanticTokensDirectionColoring': boolean;
}
export const defaultSettings: ISettings = {
  'trace': {
    'server': 'off',
  },
  'rules': {
    'component': true,
    'instantiation': true,
    'configuration': true,
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
    'not-allowed': true,
  },
  'style': {
    'preferredLogicTypePort': 'unresolved',
    'preferredLogicTypeSignal': 'unresolved',
    'preferredLogicTypeRecordChild': 'unresolved',
    'unusedSignalRegex': '_unused$',
    'ieeeCasing': 'lowercase',
    'signalPrefix': '',
    'signalSuffix': '',
    'genericPrefix': '',
    'genericSuffix': '',
    'instantiationLabelPrefix': '',
    'instantiationLabelSuffix': '',
  },
  'ports': {
    'outRegex': '^o_',
    'inRegex': '^i_',
  },
  'paths': {
    'additional': [],
    'ignoreRegex': '',
  },
  'semanticTokens': true,
  'semanticTokensDirectionColoring': false,
};