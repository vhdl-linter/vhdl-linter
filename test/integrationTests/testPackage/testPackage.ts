import assert = require("assert");
import { execSync } from "child_process";
import { mkdirSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { chdir } from "process";
// This test messes around with files in the top level and is supposed to be run in own action.
// Thus no .test.ts suffix...
const testPath = join(__dirname, 'testingFolder');
rmSync(testPath, { recursive: true, force: true });
mkdirSync(testPath);
chdir(testPath);
const packagePath = readFileSync(join(__dirname, '..', '..', '..', 'filename'), 'utf-8');
execSync(`npm init -y`);
execSync(`npm install ${join(__dirname, '..', '..', '..', packagePath)}`);
// TODO catch correct output
execSync(`npx --package @vhdl-linter/vhdl-linter vhdl-linter-cli`);
