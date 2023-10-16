import { expect, test } from '@jest/globals';
import { CancellationTokenSource } from 'vscode-languageserver';
import { runLinterGetMessagesAndLinter } from '../../helper';

test('Ignore line', async () => {
  const [messages, linter] = await runLinterGetMessagesAndLinter(__dirname, 'ignore_line.vhd');
  expect(messages).toHaveLength(1);
  const codes = (messages[0]!.code as string).split(';');
  const actions = (await Promise.all(codes.map(async code => await linter.diagnosticCodeActionRegistry[parseInt(code)]?.(`file:///test.vhd`, new CancellationTokenSource().token) ?? []))).flat();
  const onThisLine = actions.find(action => action.title.includes("Ignore unused on this line"));
  const change = Object.values(onThisLine!.edit!.changes!)[0]!;
  expect(change).toHaveLength(1);
  expect(change[0]!.newText).toBe(' unused');
  expect(change[0]!.range.start.line).toBe(2);
  expect(change[0]!.range.start.character).toBe(67);
  expect(change[0]!.range.end.line).toBe(2);
  expect(change[0]!.range.end.character).toBe(67);
});
test('Ignore File', async () => {
  const [messages, linter] = await runLinterGetMessagesAndLinter(__dirname, 'ignore_file.vhd');
  expect(messages).toHaveLength(1);
  const codes = (messages[0]!.code as string).split(';');
  const actions = (await Promise.all(codes.map(async code => await linter.diagnosticCodeActionRegistry[parseInt(code)]?.(`file:///test.vhd`, new CancellationTokenSource().token) ?? []))).flat();
  const onThisLine = actions.find(action => action.title.includes("Ignore unused for this file"));
  const change = Object.values(onThisLine!.edit!.changes!)[0]!;
  expect(change).toHaveLength(1);
  expect(change[0]!.newText).toBe(' unused');
  expect(change[0]!.range.start.line).toBe(0);
  expect(change[0]!.range.start.character).toBeGreaterThanOrEqual(46);
  expect(change[0]!.range.end.line).toBe(0);
  expect(change[0]!.range.end.character).toBeGreaterThanOrEqual(46);
});