import { parentPort, workerData } from "worker_threads";
import { lint_folder } from "../lib/cli/lintFolder";


(async () => {
  const { path, errorExpected } = workerData as { path: string, errorExpected: boolean };
  const messages = await lint_folder(new URL(path), errorExpected, true, []);
  parentPort?.postMessage(messages);
})().catch(err => console.error(err));