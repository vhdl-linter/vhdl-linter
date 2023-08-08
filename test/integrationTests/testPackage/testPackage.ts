import assert = require("assert");
import { execSync } from "child_process";
import { mkdirSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { chdir } from "process";
import { CodeClimateIssue } from "../../../lib/cli/cliUtil";
// This test messes around with files in the top level and is supposed to be run in own action.
// Thus no .test.ts suffix...
const testPath = join(__dirname, 'testingFolder');
rmSync(testPath, { recursive: true, force: true });
mkdirSync(testPath);
chdir(testPath);
const packagePath = readFileSync(join(__dirname, '..', '..', '..', 'filename'), 'utf-8');
execSync(`npm init -y`);
execSync(`npm install ${join(__dirname, '..', '..', '..', packagePath)}`);

let err: unknown;
try {
  execSync(`npx  vhdl-linter ./vhdlFolder -j --max-warning 0`, { encoding: 'utf8'});
} catch (_err: unknown) {
  err = _err;
}
assert(err instanceof Error);
const stdout = (err as Partial<VhdlLinterCliError>)?.stdout;
assert(typeof stdout === 'string');
console.log(stdout);
const result = JSON.parse(stdout) as CodeClimateIssue[];
assert(result.length === 1);
assert(result[0]?.description === `Not using signal 'a' (unused)`);

interface VhdlLinterCliError {
  stdout: string;
}