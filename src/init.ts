import { sleep } from "bun";
import { QmpCommand } from "./command";

// init the qemu vm
export default async function initVm() {
  console.log("Initializing VM...");
  if (!Bun.env.SVM_DISK) {
    throw new Error("No SVM_DISK in .env specified!");
  }

  // check if anything running on port 4444
  try {
    const sock = await Bun.connect({
      hostname: "localhost",
      port: 4444,
      socket: {
        data() {},
        open() {},
        close() {},
        error() {},
      },
    });
    sock.end();
    console.log("QEMU already running on port 4444, killing...");
    await killVm();
    await sleep(1000); // wait a second
  } catch {
    // nothing running
  }

  let args = [
    "-enable-kvm",
    "-display",
    "none",
    "-m",
    Bun.env.SVM_RAM || "512M", // ram
    "-drive",
    `file=${Bun.env.SVM_DISK},format=raw,index=0,media=disk`,
    "-qmp",
    "tcp:localhost:4444,server,nowait", // qmp socket
    "-vga",
    "std", // vga output
  ];

  try {
    if (Bun.env.SVM_ISO) {
      args.push("-cdrom", Bun.env.SVM_ISO);
      args.push("-boot", "d");
    }

    Bun.spawn(["qemu-system-x86_64", ...args]);

    // check if qemu fully started in loop
    let started = false;
    const inter = 500;
    const maxTries = 25;
    for (let i = 0; i < maxTries; i++) {
      try {
        const sock = await Bun.connect({
          hostname: "localhost",
          port: 4444,
          socket: {
            data() {},
            open() {},
            close() {},
            error() {},
          },
        });
        sock.end();
        started = true;
        break;
      } catch {
        // wait 500ms
        await new Promise((res) => setTimeout(res, inter));
      }
    }
    if (!started) {
      throw new Error("QEMU failed to start in time");
    }
    return 0;
  } catch (e) {
    throw new Error(`Failed to start qemu: ${e}`);
  }
}

export async function restartVm() {
    console.log("Restarting VM...");
    QmpCommand("system_reset");
    await sleep(5000); // wait a second
    return 0;
}

export async function killVm() {
  // kill qemu process on port 4444
  try {
    QmpCommand("quit");
    return 0;
  } catch (e) {
    throw new Error(`Failed to kill qemu: ${e}`);
  }
}
