import { VhdlLinter } from '../lib/vhdl-linter';
import { env, cwd } from 'process';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { ProjectParser } from '../lib/project-parser';

(async () => {

  const files = readdirSync(join(cwd(), 'ieee2008')).filter(file => file.match(/\.vhdl?$/i)).map(file => join(cwd(), 'ieee2008', file));
  const messages = [];
  const projectParser = new ProjectParser([join(cwd(), 'ieee2008')], '');
  await projectParser.init();
  for (const file of files) {
    const text = readFileSync(file, { encoding: 'utf8' });
    const vhdlLinter = new VhdlLinter(file, text, projectParser);
    await vhdlLinter.checkAll();
    if (vhdlLinter.messages.length > 0) {
      messages.push({
        file: file,
        messages: vhdlLinter.messages
      });
    }
  }
  console.log(JSON.stringify(messages, null, 2));
  process.exit(messages.length);
})();
