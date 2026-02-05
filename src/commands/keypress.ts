import { getQemuKey } from "../keymap";
import { keyPressEnter } from "../keypress";
import printScreen from "../print";
import fs from "fs";
import { prefixUserid } from "../commandtools";
import { sleep } from "bun";
import type { CommandHandler } from "../types";

export default {
  trigger: ["keypress"],
  handler: (async (args, say, msg, app) => {
    const text = args.join(" ");
    const input = text.replace("keypress ", "").trim();
    const qemuKey = getQemuKey(input);

    if (qemuKey) {
      await keyPressEnter(input);
      // delay to let the OS react before screenshotting
      await sleep(1000);

      const screenshot = await printScreen();
      if (screenshot) {
        await app.client.files.uploadV2({
          channel_id: msg.channel,
          file: fs.createReadStream(screenshot),
          filename: screenshot,
          title: prefixUserid(`Pressed ${input}`, msg),
        });
      }
    } else {
      await say(`Key "${input}" not recognized.`);
    }
  }) as CommandHandler,
};
