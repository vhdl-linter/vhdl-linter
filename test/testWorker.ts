import { lstatSync } from "fs";
import { parentPort, workerData } from "worker_threads";
import { ProjectParser } from "../lib/projectParser";
import { VhdlLinter } from "../lib/vhdlLinter";
import { readFileSyncNorm } from "./readFileSyncNorm";
import { MessageWrapper, prettyPrintMessages, readDirPath } from "./testUtil";
import { getDocumentSettings } from "../lib/settingsManager";
async function run_test(path: URL, error_expected: boolean, projectParser?: ProjectParser): Promise<MessageWrapper[]> {
  const messageWrappers: MessageWrapper[] = [];
  if (!projectParser) {
    projectParser = await ProjectParser.create([path]);
  }
  for (const subPath of readDirPath(path)) {
    if (lstatSync(subPath).isDirectory()) {
      messageWrappers.push(...await run_test(subPath, error_expected, projectParser));
    } else if (subPath.pathname.match(/\.vhdl?$/i)) {
      const text = readFileSyncNorm(subPath, { encoding: 'utf8' });
      const vhdlLinter = new VhdlLinter(subPath, text, projectParser, await getDocumentSettings(subPath, projectParser));
      if (vhdlLinter.parsedSuccessfully) {
        await vhdlLinter.checkAll();
      }
      if (error_expected === false) {
        if (vhdlLinter.messages.length > 0) {
          const newMessage = {
            file: subPath.pathname,
            messages: vhdlLinter.messages
          };
          messageWrappers.push(newMessage);
          console.log(prettyPrintMessages([newMessage]));
        }
      } else {
        if (vhdlLinter.messages.length !== 1) {
          const newMessage = {
            file: subPath.pathname,
            messages: [...vhdlLinter.messages, { message: `One message expected found ${vhdlLinter.messages.length}` }]
          };
          messageWrappers.push(newMessage);
          console.log(prettyPrintMessages([newMessage]));

        }
      }


    }
  }

  return messageWrappers;
}
(async () => {
  const { path, error_expected } = workerData as { path: string, error_expected: boolean };
  const messages = await run_test(new URL(path), error_expected);

  parentPort?.postMessage(messages);
})().catch(err => console.error(err));