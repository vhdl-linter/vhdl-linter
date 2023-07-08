import { DeepPartial } from "utility-types";
import { ProjectParser } from "./projectParser";
import { ISettings, defaultSettings } from "./settingsGenerated";
export { ISettings };


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

export const currentCapabilities = {
  configuration: false,
  workspaceFolder: false
};
// Cache the settings of all open documents
export const documentSettings = new Map<string, ISettings>();

export async function getDocumentSettings(resource: URL | undefined, projectParser: ProjectParser): Promise<ISettings> {
  // default settings are assumed as default and the overwritten by either
  // settings from vs code (workspace) or the closest vhdl-linter.yml
  if (resource !== undefined) {
    const fileSettings = projectParser.findSettings(resource);
    if (fileSettings?.settings !== undefined) {
      return overwriteSettings(defaultSettings, fileSettings.settings);
    }
  }
  if (currentCapabilities.configuration === false) {
    return normalizeSettings(defaultSettings);
  }
  let result = documentSettings.get(resource?.toString() ?? '');
  if (result === undefined && projectParser.vsCodeWorkspace !== undefined) {
    result = normalizeSettings(await projectParser.vsCodeWorkspace.getConfiguration({
      scopeUri: resource?.toString(),
      section: 'VhdlLinter'
    }) as ISettings);
  }
  if (result === undefined) {
    result = normalizeSettings(defaultSettings);
  }
  documentSettings.set(resource?.toString() ?? '', result);
  return result;
}