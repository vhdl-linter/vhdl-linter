import { readFileSync, writeFileSync } from "fs";

interface PackageJson {
  name: string;
  version?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const content: PackageJson = JSON.parse(readFileSync('package.json', { encoding: 'utf8' }));
content.name = "@vhdl-linter/vhdl-linter";
content.version = process.env.RELEASE_VERSION;
writeFileSync('package.json', JSON.stringify(content, undefined, 2));