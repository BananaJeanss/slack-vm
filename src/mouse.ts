import { sleep } from "bun";
import { QmpCommand } from "./command";

export async function moveMouse(x: number, y: number) {
  await QmpCommand("human-monitor-command", {
    "command-line": `mouse_move ${x} ${y}`,
  });
}

export async function clickMouse(button: "left" | "right" | "middle") {
  let buttonCode: number;
  switch (
    button // bitmask
  ) {
    case "left":
      buttonCode = 1;
      break;
    case "right":
      buttonCode = 4;
      break;
    case "middle":
      buttonCode = 2;
      break;
    default:
      console.warn(`Mouse button "${button}" is not recognized.`);
      return;
  }

  // press
  await QmpCommand("human-monitor-command", {
    "command-line": `mouse_button ${buttonCode} 1`,
  });

  await sleep(50);

  // release
  await QmpCommand("human-monitor-command", {
    "command-line": `mouse_button ${buttonCode} 0`,
  });
}
