import { DeepPartial } from "utility-types";
import { ISettings } from "./settingsGenerated";


// these are capabilities from the language server and mainly used by the language server
// However, the project parser might use the `configuration` to determine whether to get settings from the language server.
// We define them here and not in the languageServer to not start one from the projectParser
export const currentCapabilities = {
  configuration: false,
  workspaceFolder: false
};

// trims the style settings (especially the prefix/suffixes) to make sure to generate valid vhdl results
export function trimSpacesOfStyleSettings(settings: ISettings) {
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
  return trimSpacesOfStyleSettings(newSettings);
}

function recursiveObjectAssign<T extends Record<string, unknown>>(target: T, source: DeepPartial<T>) {
  // goes recursively through all keys of the source (!) and overwrites parts of target with all the values of source.
  // if both, the target and the source have an object at the key, recurse through it
  // otherwise take the value of source.
  // This will not touch all parts of target that are not in source
  Object.keys(source).forEach(key => {
    const s_val = source[key] as Record<string, unknown>;
    const t_val = target[key] as Record<string, unknown>;
    if (t_val !== undefined && typeof t_val === 'object' && typeof s_val === 'object') {
      (target as Record<string, unknown>)[key] = recursiveObjectAssign(t_val, s_val);
    } else {
      (target as Record<string, unknown>)[key] = s_val;
    }
  });
  return target;
}