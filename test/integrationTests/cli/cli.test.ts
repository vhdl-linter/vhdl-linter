import { expect, test } from "@jest/globals";
import { join, sep } from "path";
import { cwd } from "process";
import { CodeClimateIssue } from "../../../lib/cli/cliUtil";
import { cli } from "../../../lib/cli/cliExec";
import { cp, rm, writeFile } from "fs/promises";

const testPath = join(__dirname, 'testFolder');
const gitTestPath = join(__dirname, 'testFolderGit');
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
  expect(process.stdout.replace(/Linted in [\d.]+s:/, '').replaceAll(/\\/g, '/')).toMatchSnapshot();
});

test('relative path', async () => {
  const process = await callCli([makeRelative(testPath)]);
  expect(process.status).toBe(3);
  expect(process.stdout.replace(/Linted in [\d.]+s:/, '').replaceAll(/\\/g, '/')).toMatchSnapshot();
});


test('json', async () => {
  const process = await callCli([testPath, '-j']);
  expect(process.status).toBe(3);
  const result = JSON.parse(process.stdout) as CodeClimateIssue[];
  expect(result).toHaveLength(3);
  const maskedResult = result.map(entry => ({ ...entry, location: { ...entry.location, path: makeRelative(entry.location.path).replaceAll(/\\/g, '/') }, fingerprint: 'fake' }));
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
  expect(process.stdout.replace(/Linted in [\d.]+s:/, '').replaceAll(/\\/g, '/')).toMatchSnapshot();
});

test('multiple excludes', async () => {
  const process = await callCli([testPath, '-e', '**/info*', '**/error*']);
  expect(process.status).toBe(1);
  expect(process.stdout.replace(/Linted in [\d.]+s:/, '').replaceAll(/\\/g, '/')).toMatchSnapshot();
});

test('git', async () => {
  try {
    // copy the files such that they are no longe in the git index and `.gitignore` files work as expected
    await cp(testPath, gitTestPath, { recursive: true });
    // no git ignore, all three errors should exist
    const processNoIgnore = await callCli([gitTestPath]);
    expect(processNoIgnore.status).toEqual(3);
    // ignore info* -> expect only the error and warning
    await writeFile(join(gitTestPath, '.gitignore'), 'info*');
    const processIgnore = await callCli([gitTestPath]);
    expect(processIgnore.status).toEqual(2);
    expect(processIgnore.stdout.replace(/Linted in [\d.]+s:/, '').replaceAll(/\\/g, '/')).toMatchSnapshot();
  } finally {
    await rm(gitTestPath, { recursive: true });
  }
});