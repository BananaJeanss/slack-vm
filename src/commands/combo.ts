import fs from "fs";
import { getQemuKey } from "../keymap";
import { keyCombo } from "../keypress";
import { sleep } from "bun";
import printScreen from "../print";
import { prefixUserid } from "../commandtools";

export default {
  trigger: ["combo"],
  handler: async (args: string[], say: any, msg: any, app: any) => {
    const text = args.join(" ");
    const input = text.replace("combo ", "").trim();
    const keys = input.split("+").map((k: string) => k.trim());
    let allValid = true;
    for (const key of keys) {
      if (getQemuKey(key) === null) {
        allValid = false;
        await say(`Key "${key}" not recognized.`);
        break;
      }
    }
    if (allValid) {
      await keyCombo(keys);
      // delay to let the OS react before screenshotting
      await sleep(1000);

      const screenshot = await printScreen();
      if (screenshot) {
        await app.client.files.uploadV2({
          channel_id: msg.channel,
          file: fs.createReadStream(screenshot),
          filename: screenshot,
          title: prefixUserid(`Pressed combo ${input}`, msg),
        });
      }
    }
  },
};
