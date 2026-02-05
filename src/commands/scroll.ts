import { scrollMouse } from "../mouse";
import printScreen from "../print";
import fs from "fs";
import { prefixUserid } from "../commandtools";
import { sleep } from "bun";
import type { CommandHandler } from "../types";

export default {
  trigger: ["scroll"],
  handler: (async (args, say, msg, app) => {
    const text = args.join(" ");

    const input = text.replace("scroll ", "").trim();
    const amount = parseInt(input);
    if (isNaN(amount) || amount === 0) {
      await say(
        `Invalid scroll amount: "${input}". Use a non-zero integer, e.g. "scroll 3" or "scroll -2".`,
      );
    } else {
      await scrollMouse(amount);

      await sleep(1000);
      const screenshot = await printScreen();
      if (screenshot) {
        await app.client.files.uploadV2({
          channel_id: msg.channel,
          file: fs.createReadStream(screenshot),
          filename: screenshot,
          title: prefixUserid(`Scrolled mouse by ${amount}`, msg),
        });
      } else {
        await say("Failed to take screenshot after scrolling mouse.");
      }
    }
  }) as CommandHandler,
};
