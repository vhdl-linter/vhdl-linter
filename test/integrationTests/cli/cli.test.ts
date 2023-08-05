import { expect, test } from "@jest/globals";
import { join, sep } from "path";
import { cwd } from "process";
import { CodeClimateIssue } from "../../../lib/cli/cliUtil";
import { cli } from "../../../lib/cli/cliExec";

const testPath = join(__dirname, 'testFolder');
function makeRelative(path: string) {
  return path.replace(cwd() + sep, '');
}

async function callCli(argv: string[]) {
  const logOld = console.log;
  let stdout = '';
  console.log = (...args) => {
    stdout += args.join(' ') + '\n';
  };
  const status = await cli(['node', 'cli.ts', ...argv]);
  console.log = logOld;
  return {
    status,
    stdout
  };
}

test('no parameters', async () => {
  const process = await callCli([testPath]);
  expect(process.status).toBe(3);
  expect(process.stdout.replace(/Linted in [\d.]+s:/, '')).toMatchSnapshot();
});

test('relative path', async () => {
  const process = await callCli([makeRelative(testPath)]);
  expect(process.status).toBe(3);
  expect(process.stdout.replace(/Linted in [\d.]+s:/, '')).toMatchSnapshot();
});


test('json', async () => {
  const process = await callCli([testPath, '-j']);
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
])('exclude %s (expect %s messages)', async (pattern: string, messageCount: number) => {
  const process = await callCli([testPath, '-e', pattern]);
  expect(process.status).toBe(messageCount);
  expect(process.stdout.replace(/Linted in [\d.]+s:/, '')).toMatchSnapshot();
});

test('multiple excludes', async () => {
  const process = await callCli([testPath, '-e', '**/info*', '**/error*']);
  expect(process.status).toBe(1);
  expect(process.stdout.replace(/Linted in [\d.]+s:/, '')).toMatchSnapshot();
});