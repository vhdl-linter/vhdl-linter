import { DeepPartial } from "utility-types";
import { connection, documents, validateTextDocument } from "./languageServer";
import { ProjectParser } from "./projectParser";
import { ISettings, defaultSettings as defaultSettingsGenerated } from "./settingsGenerated";
export { ISettings };

let globalSettings: ISettings = defaultSettingsGenerated;


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
  if (currentCapabilities.configuration === false) {
    return normalizeSettings(globalSettings);
  }
  if (resource !== undefined) {
    const fileSettings = projectParser.findSettings(resource);
    if (fileSettings?.settings !== undefined) {
      return overwriteSettings(globalSettings, fileSettings.settings);
    }
  }
  let result = documentSettings.get(resource?.toString() ?? '');
  if (!result) {
    result = normalizeSettings(await connection.workspace.getConfiguration({
      scopeUri: resource?.toString(),
      section: 'VhdlLinter'
    }) as ISettings);
  }
  documentSettings.set(resource?.toString() ?? '', result);
  return result;
}

export function changeConfigurationHandler(change: { settings: { VhdlLinter?: ISettings } }) {

  if (currentCapabilities.configuration) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = (
      (change.settings.VhdlLinter ?? defaultSettingsGenerated)
    );
  }

  // Revalidate all open text documents
  for (const document of documents.all()) {
    void validateTextDocument(document);
  }
}