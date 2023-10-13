import { expect, test } from '@jest/globals';
import { runLinterGetMessagesAndLinter } from '../../helper';
test('Testing error on file scope', async () => {
  const [messages, linter] = await runLinterGetMessagesAndLinter(__dirname, 'file_scope.vhd');
  expect(messages[0]?.message).toContain('Unexpected statement');
  expect(messages).toHaveLength(1);
  expect(linter.file.entities).toHaveLength(2);
  expect(linter.file.architectures).toHaveLength(2);
});