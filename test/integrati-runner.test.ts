import { runTests } from '@vscode/test-electron';
import path = require('path');
import { expect, jest, test } from '@jest/globals';

jest.setTimeout(10000);
test('integration-runner', async () => {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to the extension test runner script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, '../dist/test/integration_tests/index.js');
    const testWorkspace = path.resolve(__dirname, '../test/test_files/test_no_error/01');
    const testFile = path.resolve(__dirname, '../test/test_files/test_no_error/01/_association_list_comma.vhd');
    // Download VS Code, unzip it and run the integration test
    console.log([testWorkspace, testFile]);
    await runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs: [testWorkspace, testFile] });
  } catch (err) {
    console.error(err);
    console.error('Failed to run tests');
    process.exit(1);
  }
})
