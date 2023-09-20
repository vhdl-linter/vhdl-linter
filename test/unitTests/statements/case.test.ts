import { expect, test } from '@jest/globals';
import { runLinterGetMessages } from '../../helper';

test('Test Matching case no end ?', async () => {
  const messages = await runLinterGetMessages(__dirname, 'matching_case_no_end_q.vhd', {});
  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain('A question mark is required at the end as well');
});
