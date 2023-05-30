export interface ISettings {
  'trace': {
    'server': 'off'|'messages'|'verbose';
  };
  'paths': {
    'additional': string[];
    'ignoreRegex': string;
  };
  'analysis': {
    'verilogAnalysis': boolean;
    'conditionalAnalysis': Record<string, string>;
  };
  'semanticTokens': boolean;
  'semanticTokensDirectionColoring': boolean;
  'rules': {
    'coding-style': boolean;
    'component': boolean;
    'instantiation': boolean;
    'configuration': boolean;
    'library': boolean;
    'multiple-definition': boolean;
    'not-declared': boolean;
    'naming-style': boolean;
    'type-checking': boolean;
    'type-resolved': boolean;
    'unused': boolean;
    'use-clause': boolean;
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
    'ieeeCasing': 'lowercase'|'UPPERCASE';
    'unusedPrefix': string;
    'unusedSuffix': string;
    'signalPrefix': string;
    'signalSuffix': string;
    'variablePrefix': string;
    'variableSuffix': string;
    'constantPrefix': string;
    'constantSuffix': string;
    'genericPrefix': string;
    'genericSuffix': string;
    'portOutPrefix': string;
    'portOutSuffix': string;
    'portInPrefix': string;
    'portInSuffix': string;
    'portInoutPrefix': string;
    'portInoutSuffix': string;
    'parameterOutPrefix': string;
    'parameterOutSuffix': string;
    'parameterInPrefix': string;
    'parameterInSuffix': string;
    'parameterInoutPrefix': string;
    'parameterInoutSuffix': string;
    'instantiationLabelPrefix': string;
    'instantiationLabelSuffix': string;
    'portOmission': boolean;
  };
}
export const defaultSettings: ISettings = {
  'trace': {
    'server': 'off',
  },
  'paths': {
    'additional': [],
    'ignoreRegex': '',
  },
  'analysis': {
    'verilogAnalysis': true,
    'conditionalAnalysis': {
    },
  },
  'semanticTokens': true,
  'semanticTokensDirectionColoring': false,
  'rules': {
    'coding-style': true,
    'component': true,
    'instantiation': true,
    'configuration': true,
    'library': false,
    'multiple-definition': true,
    'not-declared': true,
    'naming-style': true,
    'type-checking': true,
    'type-resolved': true,
    'unused': true,
    'use-clause': true,
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
    'ieeeCasing': 'lowercase',
    'unusedPrefix': '',
    'unusedSuffix': '_unused',
    'signalPrefix': '',
    'signalSuffix': '',
    'variablePrefix': '',
    'variableSuffix': '',
    'constantPrefix': '',
    'constantSuffix': '',
    'genericPrefix': '',
    'genericSuffix': '',
    'portOutPrefix': '',
    'portOutSuffix': '',
    'portInPrefix': '',
    'portInSuffix': '',
    'portInoutPrefix': '',
    'portInoutSuffix': '',
    'parameterOutPrefix': '',
    'parameterOutSuffix': '',
    'parameterInPrefix': '',
    'parameterInSuffix': '',
    'parameterInoutPrefix': '',
    'parameterInoutSuffix': '',
    'instantiationLabelPrefix': '',
    'instantiationLabelSuffix': '',
    'portOmission': false,
  },
};