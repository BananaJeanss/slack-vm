import { getQemuKey } from "../keymap";
import { keyPress } from "../keypress";
import { sleep } from "bun";
import printScreen from "../print";
import fs from "fs";
import { prefixUserid } from "../commandtools";


export default {
  trigger: ["key"],
  handler: async (args: string[], say: any, msg: any, app: any) => {
    let input = args.join(" ").replace("key ", "").trim();
    const parts = input.split(" "); // check if last part is a duration
    let duration: number = 50;
    if (parts.length > 1) {
      const possibleDuration = parts[parts.length - 1];
      if (possibleDuration !== undefined) {
        const parsedDuration = parseInt(possibleDuration);
        if (!isNaN(parsedDuration)) {
          duration = parsedDuration;
          input = parts.slice(0, -1).join(" ");
        }
      }
    }

    const qemuKey = getQemuKey(input);

    if (qemuKey) {
      await keyPress(input, duration);
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
  },
};
