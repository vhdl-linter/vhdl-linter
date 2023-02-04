import { readFileSync } from 'fs';

export function readFileSyncNorm(path: any, options: any) {
  return readFileSync(path, options).toString().replaceAll('\r\n', '\n');
}
