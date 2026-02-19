import { App } from "@slack/bolt";
import initVm, { killVm } from "./init";
import fs from "fs";
import { updateChannelCanvas } from "./canvas";
import { reactWith } from "./commandtools";
import path from "path";
import type { CommandModule, SlackMessage } from "./types";

// basic linux/qemu check
if (process.platform !== "linux") {
  console.error("slack-vm currently only supports Linux");
  process.exit(1);
}

if (
  Bun.spawnSync(["which", "qemu-system-x86_64"]).stdout.toString().trim() === ""
) {
  console.error("qemu-system-x86_64 not found in PATH. Please install QEMU.");
  process.exit(1);
}

// test LAN access - will fail if iptables blocks it
try {
  const proc = Bun.spawn(["ping", "-c", "1", "-W", "1", "192.168.1.1"], {
    stderr: "ignore",
    stdout: "ignore",
  });

  const exitCode = await proc.exited;

  if (exitCode === 0) {
    console.warn("------------------------------------------------");
    console.warn(
      "WARNING: LAN access detected!\nYou should run this under a non-privileged user and configure iptables to block LAN access for security reasons.",
    );
    console.warn("------------------------------------------------");
  } else {
    // good
  }
} catch {
  // good
}

const app = new App({
  socketMode: true,
  appToken: Bun.env.SLACK_APP_TOKEN,
  signingSecret: Bun.env.SLACK_SIGNING_SECRET,
  token: Bun.env.SLACK_BOT_TOKEN,
});

let isReady = false;
let isProcessing = false;

const commandModules: CommandModule[] = [];

app.message("", async ({ message, say, client }) => {
  const msg = message as SlackMessage;

  if (
    !isReady ||
    msg.subtype === "bot_message" ||
    msg.subtype === "channel_join" ||
    msg.thread_ts ||
    msg.channel !== Bun.env.SLACK_CHANNEL_ID ||
    isProcessing
  ) {
    reactWith("no_entry_sign", msg, client);
    return;
  }

  let rawText = msg.text?.trim() || "";
  rawText = rawText
    .replace(/<http[s]?:\/\/[^|>]+\|([^>]+)>|<(http[s]?:\/\/[^>]+)>/g, "$1$2")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // make sure ts gets reverted later cause otherwise no case sensitive typing
  const text = rawText.toLowerCase();

  // check if user is banned
  const bannedUsers = JSON.parse(
    fs.existsSync("./banned.json")
      ? fs.readFileSync("./banned.json", "utf-8")
      : "[]",
  ) as string[];
  if (bannedUsers.includes(msg.user.toUpperCase())) {
    reactWith("no_entry_sign", msg, client);
    return;
  }

  isProcessing = true;
  reactWith("hourglass_flowing_sand", msg, client);

  const commandName = text.split(" ")[0];

  try {
    // check if command matches any module
    const module = commandModules.find((mod) =>
      mod.trigger.includes(commandName),
    );
    if (module) {
      await module.handler(rawText.split(" ").slice(1), say, msg, app);
    } else {
      if (text.startsWith("#")) {
        isProcessing = false;
        return;
      }
      await say(`Unknown command: ${text}`);
    }
  } catch (e) {
    console.error(e);
    await say(`Error: ${e}`);
  } finally {
    isProcessing = false;
  }
});

(async () => {
  console.log("Initializing...");

  // load commands
  const commandsPath = path.join(import.meta.dir, "commands");

  // Check if directory exists to avoid crash
  if (fs.existsSync(commandsPath)) {
    const files = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".ts"));

    for (const file of files) {
      const filePath = path.join(commandsPath, file);
      try {
        // await the import so we know it's loaded
        const mod = await import(filePath);
        if (mod.default && mod.default.trigger && mod.default.handler) {
          commandModules.push(mod.default);
          console.log(`Loaded command: ${mod.default.trigger.join(", ")}`);
        } else {
          console.warn(`Skipped ${file}: Missing default export`);
        }
      } catch (err) {
        console.error(`Failed to load command ${file}:`, err);
      }
    }
  } else {
    console.error(`Commands directory not found at: ${commandsPath}`);
  }

  await initVm();

  await app.start();
  console.log(`slack-vm running | ${new Date().toISOString()}`);

  app.client.chat.postMessage({
    channel: Bun.env.SLACK_CHANNEL_ID || "",
    text: `slack-vm is now online! || ${new Date().toDateString()}`,
  });

  isReady = true;

  updateChannelCanvas(app);
  setInterval(
    () => {
      updateChannelCanvas(app);
    },
    1000 * 60 * 60 * 12,
  );
})();

process.on("SIGINT", async () => {
  console.log("Shutting down slack-vm...");
  await killVm();
  process.exit();
});
