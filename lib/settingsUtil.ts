import { DeepPartial } from "utility-types";
import { ISettings } from "./settingsGenerated";
import { existsSync, readFileSync } from "fs";
import { join } from "path";


// these are capabilities from the language server and mainly used by the language server
// However, the project parser might use the `configuration` to determine whether to get settings from the language server.
// We define them here and not in the languageServer to not start one from the projectParser
export const currentCapabilities = {
  configuration: false,
  workspaceFolder: false
};

export function normalizeSettings(settings: ISettings) {
  const newSettings = JSON.parse(JSON.stringify(settings)) as ISettings;
  for (const [key, value] of Object.entries(newSettings.style)) {
    if (typeof (newSettings.style as Record<string, unknown>)[key] === 'string') {
      (newSettings.style as Record<string, unknown>)[key] = (value as string).trim();
    }
  }
  return newSettings;
}

export function overwriteSettings(settings: ISettings, overwrite: DeepPartial<ISettings>) {
  const newSettings = JSON.parse(JSON.stringify(settings)) as ISettings;
  recursiveObjectAssign(newSettings, overwrite);
  return normalizeSettings(newSettings);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function recursiveObjectAssign<T extends Record<string, any>>(target: T, source: DeepPartial<T>) {
  Object.keys(source).forEach(key => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const s_val = source[key];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const t_val = target[key];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions
    (target as any)[key] = t_val && s_val && typeof t_val === 'object' && typeof s_val === 'object'
      ? recursiveObjectAssign(t_val, s_val)
      : s_val;
  });
  return target;
}
type primitive = string | boolean | number;
interface Schema {
  [key: string]: Schema | primitive[] | primitive;
}
// for initial transpile before doing ts-node generateSettings, the file does not exist...
const schemaFile = join(__dirname, '../settings.schema.json');
const file = existsSync(schemaFile) ? JSON.parse(readFileSync(join(__dirname, '../settings.schema.json'), { encoding: 'utf-8' })) as Schema : {};
function objectWalk(object: Schema) {
  const result: Schema = {};
  for (const [key, value] of Object.entries(object)) {
    if (key !== 'deprecationMessage') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        result[key] = objectWalk(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}
export const settingsSchema = objectWalk(file);