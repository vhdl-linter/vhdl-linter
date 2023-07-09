import { readFileSync, writeFileSync } from "fs";
import { rules } from './lib/rules/ruleIndex';

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
const settings: Record<string, {
  type: string;
  enum?: string[];
  items?: {
    type: string
  };
  description?: string;
  deprecationMessage?: string;
  properties?: object;
  patternProperties?: object;
  default?: string | boolean | string[];
}> = {};
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
for (const configuration of JSON.parse(readFileSync('package.json', { encoding: 'utf8' })).contributes.configuration) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  for (const [key, object] of Object.entries(configuration.properties)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    settings[key] = object as any;
  }
}


interface ISettings {
  [key: string]: ISettings | string | boolean | string[];
}
const _interface: ISettings = {};
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
const defaultValues: ISettings = {};
// Extract defaults
for (const [key, value] of Object.entries(settings)) {
  if (key.startsWith('VhdlLinter.')) {
    // ignore vhdlLinter in the beginning
    const path = key.split('.').slice(1);

    let defaultObj = defaultValues;
    for (const [index, segment] of path.entries()) {
      if (index === path.length - 1) {
        if (value.default !== undefined) {
          if (typeof value.default === 'string') {
            defaultObj[segment] = `'${value.default}'`;
          } else {
            defaultObj[segment] = value.default;
          }
        } else {
          throw new Error(`${path.join('.')} doesn't have a default value.`);
        }
      } else {
        const child = defaultObj[segment];
        if (child === undefined) {
          const newPath = {};
          defaultObj[segment] = newPath;
          defaultObj = newPath;
        } else {
          if (typeof child === 'object' && !Array.isArray(child)) {
            defaultObj = child;
          } else {
            throw new Error(`The setting ${path.join('.')} would overwrite another setting at ${segment}.`);
          }
        }
      }
    }
  } else {
    throw new Error(`Setting ${key} should start with 'VhdlLinter'`);
  }
}

// ajv parser does not know keywords such as `deprecationMessage` which are nice to have for the yaml verifier
function createSchema(ajvCompliant: boolean) {
  // generate schema
  const schema = {
    type: 'object',
    properties: {},
    additionalProperties: false,
  };
  for (const [key, value] of Object.entries(settings)) {
    if (key.startsWith('VhdlLinter.')) {
      const path = key.split('.').slice(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let currentProperties: Record<string, any> = schema.properties;
      for (const [index, segment] of path.entries()) {
        if (index < path.length - 1) {
          // create the properties object
          if (currentProperties[segment] === undefined) {
            currentProperties[segment] = {
              type: 'object',
              properties: {},
              additionalProperties: false
            };
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          currentProperties = currentProperties[segment].properties;
        } else {
          // create the actual object
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newObject: Record<string, any> = {
            type: value.type
          };
          if (value.description !== undefined && ajvCompliant === false) {
            newObject.description = value.description;
          }
          if (value.default !== undefined && ajvCompliant === false) {
            newObject.default = value.default;
          }
          if (value.deprecationMessage !== undefined && ajvCompliant === false) {
            newObject.deprecationMessage = value.deprecationMessage;
          }
          if (value.enum !== undefined) {
            newObject.enum = value.enum;
          }
          if (value.items !== undefined) {
            newObject.items = value.items;
          }
          if (value.properties !== undefined) {
            newObject.properties = value.properties;
          }
          if (value.patternProperties !== undefined) {
            newObject.patternProperties = value.patternProperties;
          }
          currentProperties[segment] = newObject;
        }
      }
    }
  }
  return schema;
}
// Extract interface
for (const [key, value] of Object.entries(settings)) {
  if (key.startsWith('VhdlLinter.')) {
    let type;
    if (value.enum) {
      type = value.enum.map(value => `'${value}'`).join('|');
    } else if (value.type === 'array') {
      if (!value.items) {
        throw new Error(`Array without items on key ${key}`);
      }
      type = `${value.items.type}[]`;
    } else if (value.type === 'object') {
      type = "Record<string, string>";
    } else {
      type = value.type;
    }

    const path = key.split('.').slice(1);
    let interfaceObj = _interface;
    for (const [index, segment] of path.entries()) {
      if (index === path.length - 1) {
        let optional = true;
        let innerObj = defaultValues;
        for (const [index, segment] of path.entries()) {
          if (index === path.length - 1) {
            if (innerObj[segment] !== undefined) {
              optional = false;
            } else if (value.type === 'array') {
              innerObj[segment] = '[]';
              optional = false;
            }
          } else {
            const newInner = innerObj[segment];
            if (typeof newInner !== 'object' || Array.isArray(newInner)) {
              break;
            }
            innerObj = newInner;
          }
        }
        interfaceObj[`${segment}${optional ? '?' : ''}`] = type;
      } else {
        const child = interfaceObj[segment];
        if (child === undefined) {
          const newPath = {};
          interfaceObj[segment] = newPath;
          interfaceObj = newPath;
        } else {
          if (typeof child === 'object' && !Array.isArray(child)) {
            interfaceObj = child;
          } else {
            throw new Error(`The setting ${path.join('.')} would overwrite another setting at ${segment}.`);
          }
        }
      }
    }
  }
}


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

// Export Files
let text = 'export interface ISettings ';
let indent = 0;
function output(parameter: string | ISettings | boolean | string[], delimiter = ';') {
  if (Array.isArray(parameter)) {
    text += `[${parameter.map(p => `'${p}'`).join(', ')}]${delimiter}\n`;
  } else if (typeof parameter !== 'object') {
    text += `${parameter.toString()}${delimiter}\n`;
  } else {
    indent += 2;
    text += '{\n';
    for (const [key, value] of Object.entries(parameter)) {
      const formatKey = key.endsWith('?') ? `'${key.replace(/\?$/, '')}'?` : `'${key}'`;
      text += ''.padStart(indent, ' ') + `${formatKey}: `;
      output(value, delimiter);
    }
    indent -= 2;
    text += ''.padStart(indent, ' ') + `}${delimiter}\n`;
  }
}
output(_interface);
text = text.trim().substring(0, text.length - 2);
text += `\nexport const defaultSettings: ISettings = `;
output(defaultValues, ',');
text = text.trim().substring(0, text.length - 2);
text += ';\n';
text += `export const settingsSchema = ${JSON.stringify(createSchema(true))};`;
writeFileSync(`lib/settingsGenerated.ts`, text);

writeFileSync(`lib/settings.schema.json`, JSON.stringify(createSchema(false)));