import { lstatSync } from "fs";
import { parentPort, workerData } from "worker_threads";
import { ProjectParser } from "../projectParser";
import { VhdlLinter } from "../vhdlLinter";
import { readFileSyncNorm } from "./readFileSyncNorm";
import { MessageWrapper, getCodeClimate, prettyPrintMessages, readDirPath } from "./cliUtil";
import { OIRange } from "../parser/objects";
async function run_test(path: URL, errorExpected: boolean, printMessages: boolean, projectParser?: ProjectParser): Promise<MessageWrapper[]> {
  const result: MessageWrapper[] = [];
  if (!projectParser) {
    projectParser = await ProjectParser.create([path]);
  }
  for (const subPath of readDirPath(path)) {
    if (lstatSync(subPath).isDirectory()) {
      result.push(...await run_test(subPath, errorExpected, printMessages, projectParser));
    } else if (subPath.pathname.match(/\.vhdl?$/i)) {
      const text = readFileSyncNorm(subPath, { encoding: 'utf8' });
      const vhdlLinter = new VhdlLinter(subPath, text, projectParser, await projectParser.getDocumentSettings(subPath));
      if (vhdlLinter.parsedSuccessfully) {
        await vhdlLinter.checkAll();
      }
      if (errorExpected === false) {
        if (vhdlLinter.messages.length > 0) {
          const newMessage = {
            file: subPath.pathname,
            messages: vhdlLinter.messages
          };
          result.push(newMessage);
          if (printMessages) {
            console.log(prettyPrintMessages([newMessage]));
          }
        }
      } else {
        if (vhdlLinter.messages.length !== 1) {
          const newMessage: MessageWrapper = {
            file: subPath.pathname,
            messages: [
              ...vhdlLinter.messages,
              {
                message: `One message expected found ${vhdlLinter.messages.length}`,
                range: new OIRange(vhdlLinter.file, 0, 0)
              }]
          };
          result.push(newMessage);
          if (printMessages) {
            console.log(prettyPrintMessages([newMessage]));
          }
        }
      }
    }
  }

  return result;
}
(async () => {
  const { path, errorExpected, outputCodeClimate } = workerData as { path: string, errorExpected: boolean, outputCodeClimate: boolean };
  const messages = await run_test(new URL(path), errorExpected, outputCodeClimate === false);
  if (outputCodeClimate === true) {
    parentPort?.postMessage(getCodeClimate(messages));
  } else {
    parentPort?.postMessage(messages);
  }
})().catch(err => console.error(err));