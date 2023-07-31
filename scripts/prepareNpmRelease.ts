import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

interface PackageJson {
  name: string;
  version?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const content: PackageJson = JSON.parse(readFileSync('package.json', { encoding: 'utf8' }));
content.name = "@vhdl-linter/vhdl-linter";
execSync('git fetch --tags');
content.version = execSync('git describe --tags --abbrev=0', {encoding: 'utf8'}).trim();
writeFileSync('package.json', JSON.stringify(content, undefined, 2));