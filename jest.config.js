/** @type {import('ts-jest').JestConfigWithTsJest} */

// eslint-disable-next-line no-undef
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["**/(*.)+(spec|test).ts?(x)"],
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  testTimeout: process.platform === 'darwin' ? 20_000 : 10_000,
  maxWorkers: process.platform === 'darwin' ? 1 : '100%'
};