import { readFileSync } from "fs";
import { parentPort, workerData } from "node:worker_threads";
import { ProjectParser } from "./project-parser";
import { VhdlLinter } from "./vhdl-linter";
parentPort?.on('message', (param) => {
  const { path } = param;
  const text = readFileSync(path, { encoding: 'utf8' });

  const linter = new VhdlLinter(path, text, new ProjectParser([], ''), true);
  parentPort?.postMessage(linter.file);
});