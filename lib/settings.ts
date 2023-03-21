import { DeepPartial } from 'utility-types';
import { defaultSettings as defaultSettingsGenerated, ISettings } from './settingsGenerated';
export { ISettings };

export const defaultSettings = normalizeSettings(defaultSettingsGenerated);

export function normalizeSettings(settings: ISettings) {
  const newSettings = JSON.parse(JSON.stringify(settings)) as ISettings;
  for (const [key, value] of Object.entries(newSettings.style)) {
    if (typeof (newSettings.style as Record<string, unknown>)[key] === 'string') {
      (newSettings.style as Record<string, unknown>)[key] = (value as string).trim();
    }
  }
  return newSettings;
}
export function defaultSettingsGetter() {
  return defaultSettings;
}
export function defaultSettingsWithOverwrite(overwrite?: DeepPartial<ISettings>) {
  const newDefault = JSON.parse(JSON.stringify(defaultSettings)) as ISettings;

  if (overwrite) {
    recursiveObjectAssign(newDefault, overwrite);
  }
  return () => normalizeSettings(newDefault);
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