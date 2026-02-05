import { sleep } from "bun";
import { keySequence } from "../keypress";
import { getQemuKey } from "../keymap";
import printScreen from "../print";
import fs from "fs";
import { prefixUserid } from "../commandtools";
import type { CommandHandler } from "../types";

export default {
  trigger: ["type"],
  handler: (async (args, say, msg, app) => {
    const rawText = args.join(" ");
    if (!rawText) {
      await say(`Please provide text to type. Usage: \`type <text>\``);
      return;
    }
    const input = rawText
    let allValid = true;
    // reasonable limit
    if (input.length > 256) {
      await say(`Input too long. Max 256 characters.`);
      return;
    }
    for (const char of input) {
      const qemuKey = getQemuKey(char);
      if (qemuKey === null) {
        allValid = false;
        await say(`Character "${char}" not recognized.`);
        break;
      }
    }
    if (allValid) {
      await keySequence(input.split(""));
      // delay to let the OS react before screenshotting
      await sleep(1000);

      const screenshot = await printScreen();
      if (screenshot) {
        await app.client.files.uploadV2({
          channel_id: msg.channel,
          file: fs.createReadStream(screenshot),
          filename: screenshot,
          title: prefixUserid(`Typed "${input}"`, msg),
        });
      }
    }
  }) as CommandHandler,
};
