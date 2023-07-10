export interface ISettings {
  'trace': {
    'server': 'off'|'messages'|'verbose';
  };
  'paths': {
    'additional': string[];
    'libraryMapFiles': string[];
    'ignoreRegex': string;
    'ignoreFiles': string[];
  };
  'analysis': {
    'verilogAnalysis': boolean;
    'conditionalAnalysis': Record<string, string>;
  };
  'semanticTokens': boolean;
  'semanticTokensDirectionColoring': boolean;
  'rules': {
    'coding-style': boolean;
    'consistent-casing': boolean;
    'component': boolean;
    'instantiation': boolean;
    'configuration': boolean;
    'multiple-definition': boolean;
    'not-declared': boolean;
    'naming-style': boolean;
    'casing-style': boolean;
    'type-checking': boolean;
    'type-resolved': boolean;
    'unused': boolean;
    'use-clause': boolean;
    'empty': boolean;
    'constant-write': boolean;
    'parser': boolean;
    'unit': boolean;
    'not-allowed': boolean;
    'order': boolean;
    'attribute': boolean;
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
    'objectCasing': 'snake_case'|'PascalCase'|'camelCase'|'CONSTANT_CASE'|'ignore';
    'constantGenericCasing': 'snake_case'|'PascalCase'|'camelCase'|'CONSTANT_CASE'|'ignore';
    'constantPrefix': string;
    'constantSuffix': string;
    'genericPrefix': string;
    'genericSuffix': string;
    'outPrefix': string;
    'outSuffix': string;
    'inPrefix': string;
    'inSuffix': string;
    'inoutPrefix': string;
    'inoutSuffix': string;
    'parameterOutPrefix': string;
    'parameterOutSuffix': string;
    'parameterInPrefix': string;
    'parameterInSuffix': string;
    'parameterInoutPrefix': string;
    'parameterInoutSuffix': string;
    'labelCasing': 'lowercase'|'UPPERCASE'|'ignore';
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
    'libraryMapFiles': ['vunit*.csv'],
    'ignoreRegex': '',
    'ignoreFiles': [],
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
    'consistent-casing': false,
    'component': true,
    'instantiation': true,
    'configuration': true,
    'multiple-definition': true,
    'not-declared': true,
    'naming-style': true,
    'casing-style': true,
    'type-checking': true,
    'type-resolved': true,
    'unused': true,
    'use-clause': true,
    'empty': true,
    'constant-write': true,
    'parser': true,
    'unit': true,
    'not-allowed': true,
    'order': true,
    'attribute': true,
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
    'objectCasing': 'ignore',
    'constantGenericCasing': 'ignore',
    'constantPrefix': '',
    'constantSuffix': '',
    'genericPrefix': '',
    'genericSuffix': '',
    'outPrefix': '',
    'outSuffix': '',
    'inPrefix': '',
    'inSuffix': '',
    'inoutPrefix': '',
    'inoutSuffix': '',
    'parameterOutPrefix': '',
    'parameterOutSuffix': '',
    'parameterInPrefix': '',
    'parameterInSuffix': '',
    'parameterInoutPrefix': '',
    'parameterInoutSuffix': '',
    'labelCasing': 'lowercase',
    'instantiationLabelPrefix': '',
    'instantiationLabelSuffix': '',
    'portOmission': false,
  },
};
