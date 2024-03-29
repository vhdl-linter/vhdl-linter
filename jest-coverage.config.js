/** @type {import('ts-jest').JestConfigWithTsJest} */
// eslint-disable-next-line no-undef
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["**/(*.)+(spec|test|cov).ts?(x)"],
  collectCoverage: true,
  testTimeout: 20000,
  collectCoverageFrom : [
    "lib/**/*.ts"
  ]
};