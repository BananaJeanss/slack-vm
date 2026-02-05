import fs from "fs";
import { bomboclatClick } from "../mouse";
import printScreen from "../print";
import { prefixUserid } from "../commandtools";
import { sleep } from "bun";
import type { CommandModule } from "../types";

const doubleTripleClickCommand: CommandModule = {
  trigger: ["doubleclick", "tripleclick"],
  handler: async (args, say, msg, app) => {
    const commandName = msg.text.trim().split(" ")[0].toLowerCase();
    const count = commandName === "doubleclick" ? 2 : 3;

    const button = args[0];
    const validButtons = ["left", "right", "middle"];

    if (!button || !validButtons.includes(button)) {
      await say(
        `Invalid button "${button || "unknown"}". Use "left", "right", or "middle".`,
      );
      return;
    }

    await bomboclatClick(button as "left" | "right" | "middle", count);

    await sleep(1000);
    const screenshot = await printScreen();

    if (screenshot) {
      await app.client.files.uploadV2({
        channel_id: msg.channel,
        file: fs.createReadStream(screenshot),
        filename: screenshot,
        title: prefixUserid(
          `${count === 2 ? "Double" : "Triple"} clicked ${button} mouse button`,
          msg,
        ),
      });
    } else {
      await say(
        `Failed to take screenshot after ${count === 2 ? "double" : "triple"} clicking mouse.`,
      );
    }
  },
};

export default doubleTripleClickCommand;
