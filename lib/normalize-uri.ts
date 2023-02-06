import { fileURLToPath, pathToFileURL } from "url";

export function normalizeUri(uri: string) {
    return pathToFileURL(fileURLToPath(uri)).toString();
}