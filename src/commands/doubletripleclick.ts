import fs from "fs";
import { bomboclatClick } from "../mouse";
import printScreen from "../print";
import { prefixUserid } from "../commandtools";
import { sleep } from "bun";
import type { CommandModule } from "../types";

const doubleTripleClickCommand: CommandModule = {
  trigger: ["doubleclick", "tripleclick"],
  handler: async (args, say, msg, app) => {
    const text = args.join(" ");
    if (text.startsWith("doubleclick ") || text.startsWith("tripleclick ")) {
      const doubleOrTriple = text.startsWith("doubleclick ") ? 2 : 3;
      const input = text
        .replace(doubleOrTriple === 2 ? "doubleclick " : "tripleclick ", "")
        .trim();
      const validButtons = ["left", "right", "middle"];
      if (!validButtons.includes(input)) {
        await say(
          `Invalid button "${input}". Use "left", "right", or "middle".`,
        );
      } else {
        await bomboclatClick(
          input as "left" | "right" | "middle",
          doubleOrTriple,
        );
      }
      await sleep(1000);
      const screenshot = await printScreen();
      if (screenshot) {
        await app.client.files.uploadV2({
          channel_id: msg.channel,
          file: fs.createReadStream(screenshot),
          filename: screenshot,
          title: prefixUserid(
            `${doubleOrTriple === 2 ? "Double" : "Triple"} clicked ${input} mouse button`, msg
          ),
        });
      } else {
        await say(
          `Failed to take screenshot after ${doubleOrTriple === 2 ? "double" : "triple"} clicking mouse.`,
        );
      }
    }
  },
};

export default doubleTripleClickCommand;
