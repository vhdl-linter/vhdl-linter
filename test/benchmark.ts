import {VhdlLinter} from '../lib/vhdl-linter';
import * as glob from 'glob';
import {promisify} from 'util';
import {readFileSync} from 'fs';
import {cwd} from 'process';
import { ProjectParser } from '../lib/project-parser';
console.log(cwd());
interface BenchmarkFile {
  time: number;
  path: string;
  text: string;
  linter?: VhdlLinter;
}
const filesCache: BenchmarkFile[] = [];
const projectParser = new ProjectParser([], '');
(async () => {
  const files = await promisify(glob)('test/**/*.vhd');
  console.log(`Found ${files.length} vhdl files.`);
  const time1 = new Date().getTime();
  for (const file of files) {
    filesCache.push({
      time: 0,
      path: file,
      text: readFileSync(file, {encoding: 'utf8'})
    });
  }
  const time2 = new Date().getTime();
  console.log(`Read all files after ${time2 - time1} ms`);
  for (const file of filesCache) {
    const before = new Date().getTime();
    file.linter = new VhdlLinter(file.path, file.text, projectParser, true);
    const after = new Date().getTime();
    file.time = after - before;
  }
  const time3 = new Date().getTime();
  console.log(`Linted all files after ${time3 - time2} ms`);
  filesCache.sort((b, a) => a.time  - b.time);
  console.log(filesCache.slice(0, 10).map(file => ({path: file.path, time: file.time})));
  const time4 = new Date().getTime();
  console.log(`Sorted all files after ${time4 - time3} ms`);
})();
