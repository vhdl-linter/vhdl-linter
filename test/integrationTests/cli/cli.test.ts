import { expect, test, jest } from "@jest/globals";
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
function sanitizeTextOutput(stdout: string) {
  return stdout.replace(/Linted in [\d.]+s:/, '').replaceAll(/\\/g, '/');
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
class MockedExitError extends Error { }
jest.spyOn(process, 'exit').mockImplementation(code => {
  throw new MockedExitError((code ?? 0).toString());
});

test('no parameters', async () => {
  const process = await callCli([testPath, '']);
  expect(process.status).toBe(1);
  expect(sanitizeTextOutput(process.stdout)).toMatchSnapshot();
});

test('relative path', async () => {
  const process = await callCli([makeRelative(testPath)]);
  expect(process.status).toBe(1);
  expect(sanitizeTextOutput(process.stdout)).toMatchSnapshot();
});


test('json', async () => {
  const process = await callCli([testPath, '-j']);
  expect(process.status).toBe(1);
  const result = JSON.parse(process.stdout) as CodeClimateIssue[];
  expect(result).toHaveLength(3);
  const maskedResult = result.map(entry => ({ ...entry, location: { ...entry.location, path: makeRelative(entry.location.path).replaceAll(/\\/g, '/') }, fingerprint: 'fake' }));
  expect(maskedResult).toMatchSnapshot();
});


test.each([
  ['**/error.vhd', 0], // file explicitly
  ['**/*.vhd', 0], // file wildcards
  ['subfolder', 0], // folders
  ['subfolder/info*', 1], // files in folder
])('exclude %s (expect exitCode %s)', async (pattern: string, exitCode: number) => {
  const process = await callCli([testPath, '-e', pattern]);
  expect(process.status).toBe(exitCode);
  expect(sanitizeTextOutput(process.stdout)).toMatchSnapshot();
});

test('multiple excludes', async () => {
  const process = await callCli([testPath, '-e', '**/info*', '**/warning*']);
  expect(process.status).toBe(1);
  expect(sanitizeTextOutput(process.stdout)).toMatchSnapshot();
});

test('git', async () => {
  try {
    // copy the files such that they are no longe in the git index and `.gitignore` files work as expected
    await cp(testPath, gitTestPath, { recursive: true });
    // no git ignore, all three errors should exist
    const processNoIgnore = await callCli([gitTestPath]);
    expect(processNoIgnore.status).toEqual(1);
    // ignore info* -> expect only the error and warning
    await writeFile(join(gitTestPath, '.gitignore'), 'info*');
    const processIgnore = await callCli([gitTestPath]);
    expect(processIgnore.status).toEqual(1);
    expect(sanitizeTextOutput(processIgnore.stdout)).toMatchSnapshot();
  } finally {
    await rm(gitTestPath, { recursive: true });
  }
});


test('invalid parameters', async () => {
  // is a file
  try {
    await callCli([join(testPath, 'error.vhd')]);
  } catch (e) {
    expect(e).toBeInstanceOf(MockedExitError);
    expect((e as MockedExitError).message).toBe('1');
  }
  // does not exist
  try {
    await callCli([join(testPath, 'x')]);
  } catch (e) {
    expect(e).toBeInstanceOf(MockedExitError);
    expect((e as MockedExitError).message).toBe('1');
  }
  // invalid int
  try {
    await callCli([join(testPath, '-i', '1.3')]);
  } catch (e) {
    expect(e).toBeInstanceOf(MockedExitError);
    expect((e as MockedExitError).message).toBe('1');
  }
});

test('max 0 info', async () => {
  const process = await callCli([testPath, '-i', '0', '-e', '**/error*', '**/warning*']);
  expect(process.status).toBe(1);
  expect(sanitizeTextOutput(process.stdout)).toMatchSnapshot();
});

test('max 0 warning', async () => {
  const process = await callCli([testPath, '-w', '0', '-e', '**/error*', '**/info*']);
  expect(process.status).toBe(1);
  expect(sanitizeTextOutput(process.stdout)).toMatchSnapshot();
});