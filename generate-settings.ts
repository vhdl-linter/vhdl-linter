import { readFileSync, writeFileSync } from "fs";
import { rules } from './lib/rules/rule-index';

const settings = JSON.parse(readFileSync('package.json', { encoding: 'utf8' })).contributes.configuration.properties as {
  [key: string]: {
    type: string;
    enum?: string[];
    items?: {
      type: string
    };
    default?: string | boolean;
  }
};
interface ISettings {
  [key: string]: ISettings | string | boolean
};
const int: ISettings = {};
const def: ISettings = {};
for (let [key, value] of Object.entries(settings)) {
  if (key.startsWith('VhdlLinter.')) {
    // const path = key.split('.');
    key = key.replace(/^VhdlLinter\./, '');


    const path = key.split('.');
    let obj = def;
    for (const [index, segment] of path.entries()) {
      if (index === path.length - 1) {
        if (value.default === undefined) {
          continue;
        }
        obj[segment] = typeof value.default === 'boolean' ? value.default : `'${value.default}'`;
      } else {
        const child = obj[segment];
        if (child === undefined) {
          const newPath = {};
          obj[segment] = newPath;
          obj = newPath;
        } else {
          if (typeof child !== 'object') {
            throw new Error();
          } else {
            obj = child;
          }
        }
      }
    }
  }
}
for (let [key, value] of Object.entries(settings)) {
  if (key.startsWith('VhdlLinter.')) {
    // const path = key.split('.');
    key = key.replace(/^VhdlLinter\./, '');

    let type
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
    const path = key.split('.');
    let obj = int;
    for (const [index, segment] of path.entries()) {
      if (index === path.length - 1) {
        let optional = true;
        let innerObj = def;
        for (const [index, segment] of path.entries()) {
          if (index === path.length - 1) {
            if (innerObj[segment] !== undefined) {
              optional = false;
            }
          } else {
            const newInner = innerObj[segment];
            if (typeof newInner !== 'object') {
              break;
            }
            innerObj = newInner;
          }
        }
        obj[`${segment}${optional ? '?' : ''}`] = type;
      } else {
        const child = obj[segment];
        if (child === undefined) {
          const newPath = {};
          obj[segment] = newPath;
          obj = newPath;
        } else {
          if (typeof child !== 'object') {
            throw new Error();
          } else {
            obj = child;
          }
        }
      }
    }
  }
}


// Check rules
const rulesInInterface = int?.rules;
if (typeof rulesInInterface !== 'object') {
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
function output(parameter: string | ISettings | boolean, delimiter = ';') {
  if (typeof parameter !== 'object') {
    text += `${parameter}${delimiter}\n`;
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
output(int);
text = text.trim().substring(0, text.length - 2);
text += `\nexport const defaultSettings: ISettings = `;
output(def, ',');
text = text.trim().substring(0, text.length - 2);
text += ';';
writeFileSync(`lib/settings-generated.ts`, text);