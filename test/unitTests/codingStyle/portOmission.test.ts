import { expect, test } from "@jest/globals";
import { defaultSettingsWithOverwrite } from "../../../lib/settings";
import { runLinterGetMessages } from "../../helper";

test('Testing Port omission', async () => {
  const messages = await runLinterGetMessages(__dirname, 'file.vhd', defaultSettingsWithOverwrite({
    style: {
      portOmission: true
    }
  }));
  expect(messages).toHaveLength(4);
  expect(messages).toMatchSnapshot();
});