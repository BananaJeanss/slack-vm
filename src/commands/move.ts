import printScreen from "../print";
import fs from "fs";
import { prefixUserid } from "../commandtools";
import { sleep } from "bun";
import { moveMouse } from "../mouse";

export default {
  trigger: ["move"],
  handler: async (args: string[], say: any, msg: any, app: any) => {
    const validmoves = ["up", "down", "left", "right"];
    
    const [direction, pixelsStr] = args;

    if (!direction || !pixelsStr || !validmoves.includes(direction)) {
      await say(`Invalid move command. Use "move <direction> <pixels>"`);
      return;
    }

    const pixels = parseInt(pixelsStr);

    if (isNaN(pixels) || pixels <= 0) {
      await say(`Invalid pixel value: ${pixelsStr}`);
      return;
    }

    let x = 0;
    let y = 0;
    
    switch (direction) {
      case "up":
        y = -pixels;
        break;
      case "down":
        y = pixels;
        break;
      case "left":
        x = -pixels;
        break;
      case "right":
        x = pixels;
        break;
    }

    await moveMouse(x, y);

    await sleep(1000);
    const screenshot = await printScreen();
    if (screenshot) {
      await app.client.files.uploadV2({
        channel_id: msg.channel,
        file: fs.createReadStream(screenshot),
        filename: screenshot,
        title: prefixUserid(
          `Moved mouse ${direction} by ${pixels} pixels`,
          msg,
        ),
      });
    } else {
      await say("Failed to take screenshot after moving mouse.");
    }
  },
};