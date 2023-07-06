import { connection, documents, validateTextDocument } from "./languageServer";
import { defaultSettings, ISettings, normalizeSettings } from "./settings";

let globalSettings: ISettings = defaultSettings;
export const currentCapabilities = {
  configuration: false,
  workspaceFolder: false
};
// Cache the settings of all open documents
export const documentSettings = new Map<string, ISettings>();

export async function getDocumentSettings(resource?: URL): Promise<ISettings> {
  // default settings are assumed as default and the overwritten by either
  // settings from vs code (workspace) or the closest vhdl-linter.yml
  if (!currentCapabilities.configuration) {
    return normalizeSettings(globalSettings);
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
      (change.settings.VhdlLinter ?? defaultSettings)
    );
  }

  // Revalidate all open text documents
  for (const document of documents.all()) {
    void validateTextDocument(document);
  }
}