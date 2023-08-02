import { expect, test } from "@jest/globals";
import { spawnSync } from "child_process";
import { join, sep } from "path";
import { cwd } from "process";
import { CodeClimateIssue } from "../../../lib/cli/cliUtil";

const testPath = join(__dirname, 'testFolder');
const cliPath = join(__dirname, '..', '..', '..', 'lib', 'cli', 'cli.ts');
function makeRelative(path: string) {
  return path.replace(cwd() + sep, '');
}

test('no parameters', () => {
  const process = spawnSync('npx', ['ts-node', cliPath, testPath], { encoding: 'utf8' });
  expect(process.status).toBe(3);
  expect(process.stdout.replace(/Linted in [\d.]+s:/, '')).toMatchSnapshot();
});

test('relative path', () => {
  const process = spawnSync('npx', ['ts-node', cliPath, makeRelative(testPath)], { encoding: 'utf8' });
  expect(process.status).toBe(3);
  expect(process.stdout.replace(/Linted in [\d.]+s:/, '')).toMatchSnapshot();
});


test('json', () => {
  const process = spawnSync('npx', ['ts-node', cliPath, testPath, '-j'], { encoding: 'utf8' });
  expect(process.status).toBe(3);
  const result = JSON.parse(process.stdout) as CodeClimateIssue[];
  expect(result).toHaveLength(3);
  const maskedResult = result.map(entry => ({ ...entry, location: { ...entry.location, path: makeRelative(entry.location.path) }, fingerprint: 'fake' }));
  expect(maskedResult).toMatchSnapshot();
});


test.each([
  ['**/error.vhd', 2], // file explicitly
  ['**/*.vhd', 0], // file wildcards
  ['subfolder', 0], // folders
  ['subfolder/info*', 2], // files in folder
])('exclude %s (expect %s messages)', (pattern: string, messageCount: number) => {
  const process = spawnSync('npx', ['ts-node', cliPath, testPath, '-e', pattern], { encoding: 'utf8' });
  expect(process.status).toBe(messageCount);
  expect(process.stdout.replace(/Linted in [\d.]+s:/, '')).toMatchSnapshot();
});

test('multiple excludes', () => {
  const process = spawnSync('npx', ['ts-node', cliPath, testPath, '-e', '**/info*', '**/error*'], { encoding: 'utf8' });
  expect(process.status).toBe(1);
  expect(process.stdout.replace(/Linted in [\d.]+s:/, '')).toMatchSnapshot();
});