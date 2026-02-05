import { sleep } from "bun";
import { dragMouse } from "../mouse";
import printScreen from "../print";
import fs from "fs";
import { prefixUserid } from "../commandtools";

export default {
  trigger: ["drag"],
  handler: async (args: string[], say: any, msg: any, app: any) => {
    const [button, direction, pixelsStr] = args;

    const validButtons = ["left", "right", "middle"];
    const validDirections = ["up", "down", "left", "right"];
    if (!button || !direction || !pixelsStr) {
      await say(`Invalid drag command. Use "drag <button> <direction> <pixels>"`);
      return;
    }

    if (!validButtons.includes(button)) {
      await say(`Invalid button "${button}". Use "left", "right", or "middle".`);
      return;
    }

    if (!validDirections.includes(direction)) {
      await say(`Invalid direction "${direction}". Use "up", "down", "left", or "right".`);
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

    await dragMouse(button as "left" | "right" | "middle", x, y);

    await sleep(1000);
    const screenshot = await printScreen();
    if (screenshot) {
      await app.client.files.uploadV2({
        channel_id: msg.channel,
        file: fs.createReadStream(screenshot),
        filename: screenshot,
        title: prefixUserid(
          `Dragged mouse with ${button} button to (${x}, ${y})`,
          msg
        ),
      });
    } else {
      await say("Failed to take screenshot after dragging mouse.");
    }
  },
};