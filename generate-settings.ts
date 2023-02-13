import { readFileSync, writeFileSync } from "fs";
import { rules } from './lib/rules/rule-index';

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const settings = JSON.parse(readFileSync('package.json', { encoding: 'utf8' })).contributes.configuration.properties as Record<string, {
    type: string;
    enum?: string[];
    items?: {
      type: string
    };
    default?: string | boolean | string[];
  }>;
interface ISettings {
  [key: string]: ISettings | string | boolean | string[];
}
const _interface: ISettings = {};
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
text += ';';
writeFileSync(`lib/settings-generated.ts`, text);