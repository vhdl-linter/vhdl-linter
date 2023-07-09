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
export const settingsSchema = {"type":"object","properties":{"trace":{"type":"object","properties":{"server":{"type":"string","enum":["off","messages","verbose"]}},"additionalProperties":false},"paths":{"type":"object","properties":{"additional":{"type":"array","items":{"type":"string"}},"libraryMapFiles":{"type":"array","items":{"type":"string"}},"ignoreRegex":{"type":"string"},"ignoreFiles":{"type":"array","items":{"type":"string"}}},"additionalProperties":false},"analysis":{"type":"object","properties":{"verilogAnalysis":{"type":"boolean"},"conditionalAnalysis":{"type":"object","properties":{},"patternProperties":{"":{"type":"string"}}}},"additionalProperties":false},"semanticTokens":{"type":"boolean"},"semanticTokensDirectionColoring":{"type":"boolean"},"rules":{"type":"object","properties":{"coding-style":{"type":"boolean"},"consistent-casing":{"type":"boolean"},"component":{"type":"boolean"},"instantiation":{"type":"boolean"},"configuration":{"type":"boolean"},"multiple-definition":{"type":"boolean"},"not-declared":{"type":"boolean"},"naming-style":{"type":"boolean"},"casing-style":{"type":"boolean"},"type-checking":{"type":"boolean"},"type-resolved":{"type":"boolean"},"unused":{"type":"boolean"},"use-clause":{"type":"boolean"},"empty":{"type":"boolean"},"constant-write":{"type":"boolean"},"parser":{"type":"boolean"},"unit":{"type":"boolean"},"not-allowed":{"type":"boolean"},"order":{"type":"boolean"},"attribute":{"type":"boolean"}},"additionalProperties":false},"style":{"type":"object","properties":{"preferredLogicTypePort":{"type":"string","enum":["unresolved","resolved","ignore"]},"preferredLogicTypeSignal":{"type":"string","enum":["unresolved","resolved","ignore"]},"preferredLogicTypeRecordChild":{"type":"string","enum":["unresolved","resolved","ignore"]},"ieeeCasing":{"type":"string","enum":["lowercase","UPPERCASE"]},"unusedPrefix":{"type":"string"},"unusedSuffix":{"type":"string"},"signalPrefix":{"type":"string"},"signalSuffix":{"type":"string"},"variablePrefix":{"type":"string"},"variableSuffix":{"type":"string"},"objectCasing":{"type":"string","enum":["snake_case","PascalCase","camelCase","CONSTANT_CASE","ignore"]},"constantGenericCasing":{"type":"string","enum":["snake_case","PascalCase","camelCase","CONSTANT_CASE","ignore"]},"constantPrefix":{"type":"string"},"constantSuffix":{"type":"string"},"genericPrefix":{"type":"string"},"genericSuffix":{"type":"string"},"outPrefix":{"type":"string"},"outSuffix":{"type":"string"},"inPrefix":{"type":"string"},"inSuffix":{"type":"string"},"inoutPrefix":{"type":"string"},"inoutSuffix":{"type":"string"},"parameterOutPrefix":{"type":"string"},"parameterOutSuffix":{"type":"string"},"parameterInPrefix":{"type":"string"},"parameterInSuffix":{"type":"string"},"parameterInoutPrefix":{"type":"string"},"parameterInoutSuffix":{"type":"string"},"labelCasing":{"type":"string","enum":["lowercase","UPPERCASE","ignore"]},"instantiationLabelPrefix":{"type":"string"},"instantiationLabelSuffix":{"type":"string"},"portOmission":{"type":"boolean"}},"additionalProperties":false}},"additionalProperties":false};