const { writeFileSync, readDir, lstatSync, readdirSync } = require("fs");
const { join } = require('path');
const testNoError = join(__dirname, 'test_no_error');
for (const folder of readdirSync(testNoError)) {
  if (lstatSync(join(testNoError, folder)).isDirectory()) {
    writeFileSync(join(testNoError, folder + '.test.ts'),
      `import { start_test } from "../../test";
start_test(__dirname + '/01', false);`);
  }
}
const testErrorExpected = join(__dirname, 'test_error_expected');
for (const folder of readdirSync(testErrorExpected)) {
  if (lstatSync(join(testErrorExpected, folder)).isDirectory()) {
    writeFileSync(join(testErrorExpected, folder + '.test.ts'),
      `import { start_test } from "../../test";
start_test(__dirname + '/01', true);`);
  }
}