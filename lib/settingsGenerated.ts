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
    'naming-style': boolean;
    'type-checking': boolean;
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
    'outPrefix': string;
    'outSuffix': string;
    'inPrefix': string;
    'inSuffix': string;
    'inoutPrefix': string;
    'inoutSuffix': string;
    'instantiationLabelPrefix': string;
    'instantiationLabelSuffix': string;
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
    'naming-style': true,
    'type-checking': true,
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
    'outPrefix': '',
    'outSuffix': '',
    'inPrefix': '',
    'inSuffix': '',
    'inoutPrefix': '',
    'inoutSuffix': '',
    'instantiationLabelPrefix': '',
    'instantiationLabelSuffix': '',
  },
  'paths': {
    'additional': [],
    'ignoreRegex': '',
  },
  'semanticTokens': true,
  'semanticTokensDirectionColoring': false,
};