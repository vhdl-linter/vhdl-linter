import { PathLike, PathOrFileDescriptor, readFileSync } from 'fs';

export function readFileSyncNorm(path: PathLike, options: {
  encoding?: BufferEncoding;
}) {
  return readFileSync(path, options).toString().replaceAll('\r\n', '\n');
}
