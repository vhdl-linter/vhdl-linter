import { DeepPartial } from 'utility-types';
import { defaultSettings, ISettings } from './settings-generated';
export { defaultSettings, ISettings };

export function defaultSettingsGetter() {
  return defaultSettings;
}
export function defaultSettingsWithOverwrite(overwrite?: DeepPartial<ISettings>) {
  const newDefault = JSON.parse(JSON.stringify(defaultSettings)) as ISettings;

  if (overwrite) {
    recursiveObjectAssign(newDefault, overwrite);
  }
  return () => newDefault;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function recursiveObjectAssign<T extends Record<string, any>>(target: T, source: DeepPartial<T>) {
  Object.keys(source).forEach(key => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const s_val = source[key];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const t_val = target[key];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    (target as any)[key] = t_val && s_val && typeof t_val === 'object' && typeof s_val === 'object'
      ? recursiveObjectAssign(t_val, s_val)
      : s_val;
  });
  return target;
}