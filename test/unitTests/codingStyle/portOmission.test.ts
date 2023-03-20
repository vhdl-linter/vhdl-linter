import { expect, test } from "@jest/globals";
import { defaultSettingsWithOverwrite } from "../../../lib/settings";
import { runLinterGetMessages } from "../../helper";

test('Testing Port omission', async () => {
  const messages = await runLinterGetMessages(__dirname, 'file.vhd', defaultSettingsWithOverwrite({
    rules: {
      'port-omission': true
    }
  }));
  expect(messages).toHaveLength(2);
  expect(messages).toMatchSnapshot();
});