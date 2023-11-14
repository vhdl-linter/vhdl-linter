import { parentPort, workerData } from "worker_threads";
import { lintFolder } from "../lib/cli/lintFolder";
import { ProjectParser } from "../lib/projectParser";
import { URL } from 'url';


(async () => {
  const { path, errorExpected } = workerData as { path: string, errorExpected: boolean };
  const projectParser = await ProjectParser.create([new URL(path)]);
  const messages = await lintFolder(new URL(path), errorExpected, true, [], projectParser);
  await projectParser.stop();
  parentPort?.postMessage(messages);
})().catch(err => console.error(err));