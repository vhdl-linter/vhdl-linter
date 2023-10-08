import { expect, test } from '@jest/globals';
import { runLinterGetMessagesAndFile } from '../../helper';
test('Testing error on file scope', async () => {
  const [messages, file] = await runLinterGetMessagesAndFile(__dirname, 'file_scope.vhd');
  expect(messages[0]?.message).toContain('Unexpected statement');
  expect(messages).toHaveLength(1);
  expect(file.entities).toHaveLength(2);
  expect(file.architectures).toHaveLength(2);
});