import { readFileSync } from "fs";
import { parentPort } from "node:worker_threads";
import { Parser } from "../parser/parser";
parentPort?.on('message', (param) => {
  const { path } = param;
  const parser = new Parser(readFileSync(path, { encoding: 'utf-8' }), path, true);
  const file = parser.parse();
  parentPort?.postMessage(file);
});