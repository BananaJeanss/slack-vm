import { sleep } from "bun";
import { QmpCommand } from "./command";

export let vmUpSince: number = 0;

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

  const args = [
    "-enable-kvm",
    "-display",
    `${Bun.env.ENABLE_VNC_SERVER === "true" ? "vnc=127.0.0.1:0" : "none"}`,
    "-m",
    Bun.env.SVM_RAM || "512M",

    // sandboxing
    "-sandbox",
    "on,obsolete=deny,elevateprivileges=deny,spawn=deny,resourcecontrol=deny",

    // networking
    "-netdev",
    "user,id=n1",
    "-device",
    `${Bun.env.SVM_NET_DEVICE || "e1000"},netdev=n1`,

    // maus
    ...(Bun.env.SVM_USE_USBTABLET === "true"
      ? ["-usb", "-device", "usb-tablet"]
      : []),

    // audio backend
    "-audiodev",
    "none,id=snd0",

    // speaker
    "-device",
    "ac97,audiodev=snd0",

    // drives
    "-drive",
    `file=${Bun.env.SVM_DISK},format=raw,index=0,media=disk`,

    // monitor via qmp
    "-qmp",
    "tcp:127.0.0.1:4444,server,nowait",

    // output
    "-vga",
    "std",
  ];

  try {
    if (Bun.env.SVM_ISO) {
      args.push("-cdrom", Bun.env.SVM_ISO);
      args.push("-boot", "order=cd,menu=on");
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
    vmUpSince = Date.now();
    console.log("QEMU started successfully.");
    return 0;
  } catch (e) {
    throw new Error(`Failed to start qemu: ${e}`);
  }
}

// hard reset instead of QMP system_reset since if the vm is down the whole process goes kaboom
export async function restartVm() {
  console.log("Restarting VM...");

  try {
    try {
      await killVm();
    } catch {
      console.log("VM was already dead, proceeding to init...");
    }

    await sleep(1000);

    await initVm();

    vmUpSince = Date.now();
    console.log("VM restarted successfully.");
  } catch (e) {
    throw new Error(`Failed to restart VM: ${e}`);
  }
  return 0;
}

export async function killVm() {
  // kill qemu process on port 4444
  try {
    QmpCommand("quit");
    vmUpSince = 0;
    console.log("VM killed successfully.");
    return 0;
  } catch (e) {
    throw new Error(`Failed to kill qemu: ${e}`);
  }
}
