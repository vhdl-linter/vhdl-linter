import { VhdlLinter } from '../lib/vhdl-linter';
import { env, cwd } from 'process';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { ProjectParser } from '../lib/project-parser';
function readDirPath(path: string) {
  return readdirSync(path).map(file => join(path, file));
}
async function run_test(path: string, error_expected: boolean) {
  const error_expected_folder = path;
  const folders = readDirPath(error_expected_folder);
  const messages = [];
  for (const folder of folders) {

    const projectParser = new ProjectParser([folder], '');
    await projectParser.init();
    const files = readDirPath(folder).filter(file => file.match(/\.vhdl?$/i));
    for (const file of files) {
      const text = readFileSync(file, { encoding: 'utf8' });
      const vhdlLinter = new VhdlLinter(file, text, projectParser);
      await vhdlLinter.checkAll();
      if (error_expected === false) {
        if (vhdlLinter.messages.length > 0) {
          messages.push({
            file: file,
            messages: vhdlLinter.messages
          });
        }
      } else {
        if (vhdlLinter.messages.length === 0) {
          messages.push({
            file: file,
            messages: 'Message expected found none'
          });
        }
      }
    }
    if (messages.length > 0) {
      console.log(messages.map(file => file.file));
      // console.log(JSON.stringify(messages, null, 2));
    }

  }
  return messages;
}
(async () => {
  const messages = [];
  messages.push(... await run_test(join(cwd(), 'test', 'test_files', 'test_error_expected'), true));
  messages.push(... await run_test(join(cwd(), 'test', 'test_files', 'test_no_error'), false));

  process.exit(messages.length);
})();
