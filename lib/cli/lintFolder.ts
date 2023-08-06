import { lstatSync } from "fs";
import { ProjectParser, vhdlGlob } from "../projectParser";
import { VhdlLinter } from "../vhdlLinter";
import { readFileSyncNorm } from "./readFileSyncNorm";
import { MessageWrapper, prettyPrintMessages, readDirPath } from "./cliUtil";
import { OIRange } from "../parser/objects";
import { minimatch } from "minimatch";
import { basename, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { platform } from "process";

let gitExists = false;
if (platform === 'win32') {
  try {
    execSync(`git --version`);
    gitExists = true;
  } catch (e) {
    gitExists = false;
  }
} else {
  try {
    execSync(`command -v git`);
    gitExists = true;
  } catch (e) {
    gitExists = false;
  }
}
function isGitIgnored(path: string) {
  if (path.endsWith('.git')) {
    return true;
  }
  if (gitExists) {
    // git check-ignore will fail if the file is *NOT* ignored or when we are not in a git repository
    try {
      execSync(`git check-ignore ${path}`, {cwd: dirname(path)});
      // is a git repo and the file is ignored...
      return true;
    } catch (e) {
      return false;
    }
  } else {
    return false;
  }
}
function ignore(excludePatterns: string[], relativePath: string, absolutePath: string) {
  return excludePatterns.some(glob => minimatch(relativePath, glob)) || isGitIgnored(absolutePath);
}

export async function lintFolder(path: URL, errorExpected: boolean, printMessages: boolean, excludePatterns: string[], projectParser: ProjectParser): Promise<MessageWrapper[]> {
  const result: MessageWrapper[] = [];
  const rootPath = fileURLToPath(projectParser.workspaces[0]!);
  for (const subPath of readDirPath(path)) {
    // in this case we only ever have one workspace
    const relativePath = fileURLToPath(subPath).replace(rootPath, '').substring(1);
    // ignore excluded folders & files
    if (lstatSync(subPath).isDirectory()) {
      if (ignore(excludePatterns, relativePath, fileURLToPath(subPath))) {
        continue;
      }
      result.push(...await lintFolder(subPath, errorExpected, printMessages, excludePatterns, projectParser));
    } else if (minimatch(basename(relativePath), vhdlGlob)) {
      if (ignore(excludePatterns, relativePath, fileURLToPath(subPath))) {
        continue;
      }
      const text = readFileSyncNorm(subPath, { encoding: 'utf8' });
      const vhdlLinter = new VhdlLinter(subPath, text, projectParser, await projectParser.getDocumentSettings(subPath));
      if (vhdlLinter.parsedSuccessfully) {
        await vhdlLinter.checkAll();
      }
      if (errorExpected === false) {
        if (vhdlLinter.messages.length > 0) {
          const newMessage = {
            file: fileURLToPath(subPath),
            messages: vhdlLinter.messages
          };
          result.push(newMessage);
          if (printMessages) {
            console.log(prettyPrintMessages(rootPath, [newMessage]));
          }
        }
      } else {
        if (vhdlLinter.messages.length !== 1) {
          const newMessage: MessageWrapper = {
            file: fileURLToPath(subPath),
            messages: [
              ...vhdlLinter.messages,
              {
                message: `One message expected found ${vhdlLinter.messages.length}`,
                range: new OIRange(vhdlLinter.file, 0, 0)
              }]
          };
          result.push(newMessage);
          if (printMessages) {
            console.log(prettyPrintMessages(rootPath, [newMessage]));
          }
        }
      }
    }
  }

  return result;
}