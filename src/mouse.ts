import { sleep } from "bun";
import { QmpCommand } from "./command";

let cursorX = -1;
let cursorY = -1;
let screenW = 0;
let screenH = 0;

async function getScreenDimensions(): Promise<{ width: number; height: number }> {
  if (screenW > 0 && screenH > 0) return { width: screenW, height: screenH };

  const host = Bun.env.PROXMOX_VNC_IP ?? "localhost";
  const port = parseInt(Bun.env.PROXMOX_SCREENSHOT_PORT ?? "5944", 10);

  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0);
    const waiters: Array<{ n: number; resolve: (b: Buffer) => void }> = [];

    function drain() {
      while (waiters.length > 0 && buf.length >= waiters[0]!.n) {
        const { n, resolve: res } = waiters.shift()!;
        res(Buffer.from(buf.subarray(0, n)));
        buf = buf.subarray(n);
      }
    }

    function push(data: Buffer) {
      buf = Buffer.concat([buf, data]);
      drain();
    }

    function read(n: number): Promise<Buffer> {
      return new Promise((res) => {
        waiters.push({ n, resolve: res });
        drain();
      });
    }

    Bun.connect({
      hostname: host,
      port,
      socket: {
        async open(sock) {
          try {
            await read(12); // server version
            sock.write(Buffer.from("RFB 003.008\n"));

            const nTypes = (await read(1)).readUInt8(0);
            const types = await read(nTypes);
            if (!types.includes(1)) throw new Error("VNC: None auth not offered");
            sock.write(Buffer.from([1]));

            await read(4); // SecurityResult
            sock.write(Buffer.from([1])); // ClientInit shared

            const init = await read(24);
            const width = init.readUInt16BE(0);
            const height = init.readUInt16BE(2);
            const nameLen = init.readUInt32BE(20);
            await read(nameLen);

            sock.end();
            screenW = width;
            screenH = height;
            resolve({ width, height });
          } catch (e) {
            sock.end();
            reject(e);
          }
        },
        data(_sock, chunk) {
          push(Buffer.from(chunk));
        },
        error(_sock, err) {
          reject(err);
        },
        close() {
          if (waiters.length > 0) reject(new Error("VNC closed unexpectedly"));
        },
      },
    });
  });
}

async function sendAbsolute(absX: number, absY: number) {
  await QmpCommand("input-send-event", {
    events: [
      { type: "abs", data: { axis: "x", value: absX } },
      { type: "abs", data: { axis: "y", value: absY } },
    ],
  });
}

export async function moveMouse(dx: number, dy: number) {
  if (Bun.env.USE_PROXMOX === "true") {
    const { width, height } = await getScreenDimensions();

    if (cursorX === -1) {
      cursorX = Math.round(width / 2);
      cursorY = Math.round(height / 2);
    }

    cursorX = Math.max(0, Math.min(width, cursorX + dx));
    cursorY = Math.max(0, Math.min(height, cursorY + dy));

    const absX = Math.round(cursorX * 32767 / width);
    const absY = Math.round(cursorY * 32767 / height);

    await sendAbsolute(absX, absY);
  } else {
    await QmpCommand("human-monitor-command", {
      "command-line": `mouse_move ${dx} ${dy}`,
    });
  }
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

// double and triple bombooooclaaaat click
export async function bomboclatClick(
  button: "left" | "right" | "middle",
  clicks: number,
) {
  for (let i = 0; i < clicks; i++) {
    await clickMouse(button);
    await sleep(20);
  }
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
  await moveMouse(x, y);

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
