import { expect, test } from "@jest/globals";
import { runLinterGetMessages } from "../../helper";

test('Testing Port omission', async () => {
  const messages = await runLinterGetMessages(__dirname, 'file.vhd', {
    style: {
      portOmission: true
    }
  });
  expect(messages).toHaveLength(4);
  expect(messages).toMatchSnapshot();
});