import { clickMouse } from "../mouse";
import printScreen from "../print";
import fs from "fs";
import { sleep } from "bun";
import { prefixUserid } from "../commandtools";
import type { CommandHandler } from "../types";

export default {
  trigger: ["click"],
  handler: (async (args, say, msg, app) => {
    const text = args.join(" ");
    const input = text.replace("click ", "").trim();
    const validButtons = ["left", "right", "middle"];
    if (!validButtons.includes(input)) {
      await say(`Invalid button "${input}". Use "left", "right", or "middle".`);
    } else {
      await clickMouse(input as "left" | "right" | "middle");

      await sleep(1000);
      const screenshot = await printScreen();
      if (screenshot) {
        await app.client.files.uploadV2({
          channel_id: msg.channel,
          file: fs.createReadStream(screenshot),
          filename: screenshot,
          title: prefixUserid(`Clicked ${input} mouse button`, msg),
        });
      } else {
        await say("Failed to take screenshot after clicking mouse.");
      }
    }
  }) as CommandHandler,
};
