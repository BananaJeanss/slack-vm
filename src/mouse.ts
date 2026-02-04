import { sleep } from "bun";
import { QmpCommand } from "./command";

export async function moveMouse(x: number, y: number) {
  await QmpCommand("human-monitor-command", {
    "command-line": `mouse_move ${x} ${y}`,
  });
}

export async function clickMouse(button: "left" | "right" | "middle") {
  let buttonCode: number;
  switch (button) {
    case "left":
      buttonCode = 1;
      break;
    case "middle":
      buttonCode = 2;
      break;
    case "right":
      buttonCode = 4;
      break;
    default:
      console.warn(`Mouse button "${button}" is not recognized.`);
      return;
  }

  // press
  await QmpCommand("human-monitor-command", {
    "command-line": `mouse_button ${buttonCode}`,
  });

  await sleep(50);

  // release
  await QmpCommand("human-monitor-command", {
    "command-line": `mouse_button 0`,
  });
}

export async function dragMouse(
  button: "left" | "right" | "middle",
  x: number,
  y: number,
) {
  // click down
  let buttonCode: number;
  switch (button) {
    case "left":
      buttonCode = 1;
      break;
    case "middle":
      buttonCode = 2;
      break;
    case "right":
      buttonCode = 4;
      break;
    default:
      console.warn(`Mouse button "${button}" is not recognized.`);
      return;
  }

  await QmpCommand("human-monitor-command", {
    "command-line": `mouse_button ${buttonCode}`,
  });

  await sleep(50);

  // move
  await QmpCommand("human-monitor-command", {
    "command-line": `mouse_move ${x} ${y}`,
  });

  await sleep(50);

  // release
  await QmpCommand("human-monitor-command", {
    "command-line": `mouse_button 0`,
  });
}

export async function scrollMouse(amount: number = 1) {
  const absoluteAmount = Math.abs(amount);
  const direction = amount > 0 ? 1 : -1;
  
  // cap the loop
  const ticks = Math.min(absoluteAmount, 20); 

  // ticks instead cause ps/2 is being weird i assume, -99999999 would scroll very little
  for (let i = 0; i < ticks; i++) {
    await QmpCommand("human-monitor-command", {
      "command-line": `mouse_move 0 0 ${direction}`,
    });
    await sleep(10); 
  }
}