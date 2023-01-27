
import { expect, test } from '@jest/globals';
import exp = require('constants');

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../extension';


test('Sample test', () => {
  expect([1, 2, 3].indexOf(5)).toStrictEqual(-1);
});
