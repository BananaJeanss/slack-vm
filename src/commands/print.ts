import printScreen from "../print";
import fs from "fs";
import { prefixUserid } from "../commandtools";
import type { CommandHandler } from "../types";

export default {
  trigger: ["print", "screenshot"],
  handler: (async (args, say, msg, app) => {
    const filename = await printScreen();
    if (filename) {
      await app.client.files.uploadV2({
        channel_id: msg.channel,
        file: fs.createReadStream(filename),
        filename: filename,
        title: prefixUserid(`VM Screenshot | ${new Date().toISOString()}`, msg),
      });
    } else {
      await say("Failed to take screenshot.");
    }
  }) as CommandHandler,
};
