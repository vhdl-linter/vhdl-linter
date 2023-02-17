import { dirname, join } from "path";
import { pathToFileURL } from "url";
import { Elaborate } from "../lib/elaborate/elaborate";
import { ProjectParser } from "../lib/project-parser";
import { defaultSettingsGetter } from "../lib/settings";
import { VhdlLinter } from "../lib/vhdl-linter";
import { readFileSyncNorm } from "./readFileSyncNorm";

void (async () => {
  const filename = join(__dirname, '/../../test/test_files/test_no_error/OSVVM/CoveragePkg.vhd');
  console.log(filename);
  const projectParser = await ProjectParser.create([pathToFileURL(dirname(filename))], '', defaultSettingsGetter, true);
  const parserTimes = [];
  const elabTimes = [];
  const elabRefTimes = [];
  function average(ar: number[]) {
    return ar.reduce((prev, cur) => prev + cur, 0) / ar.length;
  }
  for (let i = 0; i < 10; i++) {
    let start = Date.now();
    const linter = new VhdlLinter(pathToFileURL(filename), readFileSyncNorm(filename, { encoding: 'utf8' }),
      projectParser, defaultSettingsGetter);
    parserTimes.push(Date.now() - start);
    start = Date.now()
    const { elabRef } = await Elaborate.elaborate(linter);
    elabRefTimes.push(elabRef);
    elabTimes.push(Date.now() - start);
  }
  console.log(`Average parserTimes ${average(parserTimes)} elab ${average(elabTimes)} elabRef ${average(elabRefTimes)}`);

})();