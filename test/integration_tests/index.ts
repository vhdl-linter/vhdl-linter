import { run as runJest } from 'jest-cli';
import * as vscode from 'vscode';
import * as as from '../../lib/vscode';
export async function run(): Promise<void> {
  console.log(as.client.diagnostics);
  await vscode.window.showInformationMessage('Start all tests.');
  console.log(as.client.diagnostics);
  await vscode.window.showInformationMessage('Start all tests.333');
  console.log(as.client.diagnostics);
  // const projectRootPath = '/path/to/project/root';

  // // Add any Jest configuration options here
  // const jestConfig = {
  //   roots: ['./dist/tests'],
  //   testRegex: '\\.test\\.ts$'
  // };

  // // Run the Jest asynchronously
  // const result = await runJest(jestConfig as any, projectRootPath);

  // // Analyze the results
  // // (see typings for result format)
  // if (result.results.success) {
  //   console.log(`Tests completed`);
  // } else {
  //   console.error(`Tests failed`);
  // }

  // // Create the mocha test
  // const mocha = new Mocha({
  //   ui: 'tdd',
  //   color: true
  // });

  // const testsRoot = path.resolve(__dirname, '..');

  // return new Promise((c, e) => {
  //   glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
  //     if (err) {
  //       return e(err);
  //     }

  //     // Add files to the test suite
  //     files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

  //     try {
  //       // Run the mocha test
  //       mocha.run(failures => {
  //         if (failures > 0) {
  //           e(new Error(`${failures} tests failed.`));
  //         } else {
  //           c();
  //         }
  //       });
  //     } catch (err) {
  //       e(err);
  //     }
  //   });
  // });
}