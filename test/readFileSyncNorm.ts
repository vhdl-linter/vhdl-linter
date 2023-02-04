import { PathOrFileDescriptor, readFileSync } from 'fs';

export function readFileSyncNorm(path: PathOrFileDescriptor, options: {
  encoding?: null | undefined;
  flag?: string | undefined;
}) {
  return readFileSync(path, options).toString().replaceAll('\r\n', '\n');
}
