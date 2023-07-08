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
export const settingsSchema = {"type":"object","properties":{"trace":{"type":"object","properties":{"server":{"type":"string","description":"Traces the communication between VS Code and the language server.","default":"off","enum":["off","messages","verbose"]}},"additionalProperties":false},"paths":{"type":"object","properties":{"additional":{"type":"array","description":"Additional Paths to be included (for verification library etc.)","default":[],"items":{"type":"string"}},"libraryMapFiles":{"type":"array","description":"Glob expressions for files that contain a library, source file mapping in the format `library,filename`.","default":["vunit*.csv"],"items":{"type":"string"}},"ignoreRegex":{"type":"string","description":"Regex for files to be ignored by the Project Parser","default":"","deprecationMessage":"This is being deprecated in favor of `paths.ignoreFiles`"},"ignoreFiles":{"type":"array","description":"Glob expressions for files to be ignored by the project parser","default":[],"items":{"type":"string"}}},"additionalProperties":false},"analysis":{"type":"object","properties":{"verilogAnalysis":{"type":"boolean","description":"Enable analysis of verilog files. Only modules get extracted and evaluated for instantiation from vhdl files.","default":true},"conditionalAnalysis":{"type":"object","description":"Settings for conditional analysis (vhdl 2019). e.g. DEVICE = MY_DEV_BOARD or use standard defined values: TOOL_TYPE = SYNTHESIS","default":{},"properties":{},"patternProperties":{"":{"type":"string"}}}},"additionalProperties":false},"semanticTokens":{"type":"boolean","description":"Enable semantic tokens which enhance syntax highlighting. ","default":true},"semanticTokensDirectionColoring":{"type":"boolean","description":"Color inputs differently than outputs.","default":false},"rules":{"type":"object","properties":{"coding-style":{"type":"boolean","description":"Enforce rules for enforcing coding style.","default":true},"consistent-casing":{"type":"boolean","description":"Enforce consistent casing ie. check if declaration and reference have the same case","default":false},"component":{"type":"boolean","description":"Enable the rule to check if component declarations are correct.","default":true},"instantiation":{"type":"boolean","description":"Enable the rule to check if ports and generics of instantiations are correct.","default":true},"configuration":{"type":"boolean","description":"Enable the rule to check if configuration reference existing entity.","default":true},"multiple-definition":{"type":"boolean","description":"Enable the rule to check if something is defined multiple times.","default":true},"not-declared":{"type":"boolean","description":"Enable the rule to check if something is used but not declared","default":true},"naming-style":{"type":"boolean","description":"Enable the rule to check if objects match the prefix/suffix given in style.*.","default":true},"casing-style":{"type":"boolean","description":"Enable the rule to check if objects match the casing given in style.*.","default":true},"type-checking":{"type":"boolean","description":"Enable some basic type checking","default":true},"type-resolved":{"type":"boolean","description":"Enable the rule to check if ports and signals have the resolved/unresolved type given in 'style.preferredLogicType*.'","default":true},"unused":{"type":"boolean","description":"Enable the rule to warn for unused objects.","default":true},"use-clause":{"type":"boolean","description":"Enable the rule to check use clauses.","default":true},"empty":{"type":"boolean","description":"Enable the rule to warn for empty files.","default":true},"constant-write":{"type":"boolean","description":"Enable the rule to warn when writing a constant value.","default":true},"parser":{"type":"boolean","description":"Enable displaying parser errors.","default":true},"unit":{"type":"boolean","description":"Enable the rule to check if a space is before a unit reference","default":true},"not-allowed":{"type":"boolean","description":"Enable the rule to check if declarations are allowed where they are used.","default":true},"order":{"type":"boolean","description":"Enable the rule to check if all references are after the corresponding declaration (when in the same file).","default":true},"attribute":{"type":"boolean","description":"Enable the rule to check if all attributes have prefixes.","default":true}},"additionalProperties":false},"style":{"type":"object","properties":{"preferredLogicTypePort":{"type":"string","description":"Preferred logic type (resolved/unresolved) to check for on ports (The rule 'type-resolved' can also be ignored as a whole).","default":"unresolved","enum":["unresolved","resolved","ignore"]},"preferredLogicTypeSignal":{"type":"string","description":"Preferred logic type (resolved/unresolved) to check for on signals (The rule 'type-resolved' can also be ignored as a whole).","default":"unresolved","enum":["unresolved","resolved","ignore"]},"preferredLogicTypeRecordChild":{"type":"string","description":"Preferred logic type (resolved/unresolved) to check for on record children (The rule 'type-resolved' can also be ignored as a whole).","default":"unresolved","enum":["unresolved","resolved","ignore"]},"ieeeCasing":{"type":"string","description":"Default casing for the completion of items of the ieee and standard libraries.","default":"lowercase","enum":["lowercase","UPPERCASE"]},"unusedPrefix":{"type":"string","description":"Prefix for unused objects (no unused warning is shown for these objects)","default":""},"unusedSuffix":{"type":"string","description":"Prefix for unused objects (no unused warning is shown for these objects)","default":"_unused"},"signalPrefix":{"type":"string","description":"Prefix for signals (can be left empty)","default":""},"signalSuffix":{"type":"string","description":"Suffix for signals (can be left empty)","default":""},"variablePrefix":{"type":"string","description":"Prefix for variables (can be left empty)","default":""},"variableSuffix":{"type":"string","description":"Suffix for variables (can be left empty)","default":""},"objectCasing":{"type":"string","description":"Casing for all non-constant objects (signals, variables, entities etc.).","default":"ignore","enum":["snake_case","PascalCase","camelCase","CONSTANT_CASE","ignore"]},"constantGenericCasing":{"type":"string","description":"Casing for constants and generics.","default":"ignore","enum":["snake_case","PascalCase","camelCase","CONSTANT_CASE","ignore"]},"constantPrefix":{"type":"string","description":"Prefix for constants (can be left empty)","default":""},"constantSuffix":{"type":"string","description":"Suffix for constants (can be left empty)","default":""},"genericPrefix":{"type":"string","description":"Prefix for generics (can be left empty)","default":""},"genericSuffix":{"type":"string","description":"Suffix for generics (can be left empty)","default":""},"outPrefix":{"type":"string","description":"Prefix for port outputs (can be left empty).","default":""},"outSuffix":{"type":"string","description":"Suffix for port outputs (can be left empty).","default":""},"inPrefix":{"type":"string","description":"Prefix for port inputs (can be left empty).","default":""},"inSuffix":{"type":"string","description":"Suffix for port inputs (can be left empty).","default":""},"inoutPrefix":{"type":"string","description":"Prefix for port inouts (can be left empty).","default":""},"inoutSuffix":{"type":"string","description":"Suffix for port inouts (can be left empty).","default":""},"parameterOutPrefix":{"type":"string","description":"Prefix for parameter outputs (can be left empty).","default":""},"parameterOutSuffix":{"type":"string","description":"Suffix for parameter outputs (can be left empty).","default":""},"parameterInPrefix":{"type":"string","description":"Prefix for parameter inputs (can be left empty).","default":""},"parameterInSuffix":{"type":"string","description":"Suffix for parameter inputs (can be left empty).","default":""},"parameterInoutPrefix":{"type":"string","description":"A Prefix for parameter inouts (can be left empty).","default":""},"parameterInoutSuffix":{"type":"string","description":"Suffix for parameter inouts (can be left empty).","default":""},"labelCasing":{"type":"string","description":"Casing for labels.","default":"lowercase","enum":["lowercase","UPPERCASE","ignore"]},"instantiationLabelPrefix":{"type":"string","description":"Prefix for instantiation labels (can be left empty)","default":""},"instantiationLabelSuffix":{"type":"string","description":"Suffix for instantiation labels (can be left empty)","default":""},"portOmission":{"type":"boolean","description":"Enforce port omission rule: Ports may not be implicitly left unconnected. Explicit open must be used.","default":false}},"additionalProperties":false}},"additionalProperties":false};