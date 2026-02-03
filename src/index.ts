import { App } from "@slack/bolt";
import initVm, { killVm, restartVm } from "./init";
import printScreen from "./print";
import fs from "fs";
import { getQemuKey } from "./keymap";
import { keyCombo, keyPress, keyPressEnter, keySequence } from "./keypress";
import { sleep } from "bun";
import { clickMouse } from "./mouse";

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

const app = new App({
  socketMode: true,
  appToken: Bun.env.SLACK_APP_TOKEN,
  signingSecret: Bun.env.SLACK_SIGNING_SECRET,
  token: Bun.env.SLACK_BOT_TOKEN,
});

let isReady = false;
let isProcessing = false;

let votesForRestart = 0;
const VOTES_NEEDED = Number(Bun.env.RESTART_VOTES_NEEDED) || 3;

app.message("", async ({ message, say, client }) => {
  const msg = message as any;

  if (
    !isReady ||
    msg.subtype === "bot_message" ||
    msg.channel !== Bun.env.SLACK_CHANNEL_ID ||
    isProcessing
  ) {
    client.reactions.add({
      name: "no_entry_sign",
      channel: msg.channel,
      timestamp: msg.ts,
    });
    return;
  }

  const text = msg.text?.toLowerCase().trim() || "";

  // owner check
  const isOwner = msg.user === Bun.env.SLACK_BOTADMIN_USERID;

  // check if user is banned
  const bannedUsers = JSON.parse(
    fs.existsSync("./banned.json")
      ? fs.readFileSync("./banned.json", "utf-8")
      : "[]",
  ) as string[];
  if (bannedUsers.includes(msg.user.toUpperCase())) {
    client.reactions.add({
      name: "no_entry_sign",
      channel: msg.channel,
      timestamp: msg.ts,
    });
    return;
  }

  isProcessing = true;
  client.reactions.add({
    name: "hourglass_flowing_sand",
    channel: msg.channel,
    timestamp: msg.ts,
  });

  try {
    if (text.includes("print")) {
      const filename = await printScreen();
      if (filename) {
        await app.client.files.uploadV2({
          channel_id: msg.channel,
          file: fs.createReadStream(filename),
          filename: filename,
          title: `VM Screenshot | ${new Date().toISOString()}`,
        });
      } else {
        await say("Failed to take screenshot.");
      }
    } else if (text.startsWith("key ")) {
      const input = text.replace("key ", "").trim();
      const qemuKey = getQemuKey(input);

      if (qemuKey) {
        await keyPress(input);
        // delay to let the OS react before screenshotting
        await sleep(1000);

        const screenshot = await printScreen();
        if (screenshot) {
          await app.client.files.uploadV2({
            channel_id: msg.channel,
            file: fs.createReadStream(screenshot),
            filename: screenshot,
            title: `Pressed ${input}`,
          });
        }
      } else {
        await say(`Key "${input}" not recognized.`);
      }
    } else if (text.startsWith("keypress ")) {
      const input = text.replace("keypress ", "").trim();
      const qemuKey = getQemuKey(input);

      if (qemuKey) {
        await keyPressEnter(input);
        // delay to let the OS react before screenshotting
        await sleep(1000);

        const screenshot = await printScreen();
        if (screenshot) {
          await app.client.files.uploadV2({
            channel_id: msg.channel,
            file: fs.createReadStream(screenshot),
            filename: screenshot,
            title: `Pressed ${input}`,
          });
        }
      } else {
        await say(`Key "${input}" not recognized.`);
      }
    } else if (text.startsWith("combo ")) {
      const input = text.replace("combo ", "").trim();
      const keys = input.split("+").map((k: string) => k.trim());
      let allValid = true;
      for (const key of keys) {
        if (getQemuKey(key) === null) {
          allValid = false;
          await say(`Key "${key}" not recognized.`);
          break;
        }
      }
      if (allValid) {
        await keyCombo(keys);
        // delay to let the OS react before screenshotting
        await sleep(1000);

        const screenshot = await printScreen();
        if (screenshot) {
          await app.client.files.uploadV2({
            channel_id: msg.channel,
            file: fs.createReadStream(screenshot),
            filename: screenshot,
            title: `Pressed combo ${input}`,
          });
        }
      }
    } else if (text.startsWith("type ")) {
      const input = text.replace("type ", "").trim();
      let allValid = true;
      for (const char of input) {
        const qemuKey = getQemuKey(char);
        if (qemuKey === null) {
          allValid = false;
          await say(`Character "${char}" not recognized.`);
          break;
        }
      }
      if (allValid) {
        await keySequence(input.split(""));
        // delay to let the OS react before screenshotting
        await sleep(1000);

        const screenshot = await printScreen();
        if (screenshot) {
          await app.client.files.uploadV2({
            channel_id: msg.channel,
            file: fs.createReadStream(screenshot),
            filename: screenshot,
            title: `Typed "${input}"`,
          });
        }
      }
    } else if (text.startsWith("move ")) {
      const input = text.replace("move ", "").trim();
      const validmoves = ["up", "down", "left", "right"];
      const parts = input.split(" ");
      if (parts.length !== 2 || !validmoves.includes(parts[0])) {
        await say(`Invalid move command. Use "move <direction> <pixels>"`);
      } else {
        const direction = parts[0];
        const pixels = parseInt(parts[1]);
        if (isNaN(pixels) || pixels <= 0) {
          await say(`Invalid pixel value: ${parts[1]}`);
        } else {
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
          const { moveMouse } = await import("./mouse");
          await moveMouse(x, y);

          await sleep(1000);
          const screenshot = await printScreen();
          if (screenshot) {
            await app.client.files.uploadV2({
              channel_id: msg.channel,
              file: fs.createReadStream(screenshot),
              filename: screenshot,
              title: `Moved mouse ${direction} by ${pixels} pixels`,
            });
          } else {
            await say("Failed to take screenshot after moving mouse.");
          }
        }
      }
    } else if (text.startsWith("click ")) {
      const input = text.replace("click ", "").trim();
      const validButtons = ["left", "right", "middle"];
      if (!validButtons.includes(input)) {
        await say(
          `Invalid button "${input}". Use "left", "right", or "middle".`,
        );
      } else {
        await clickMouse(input as "left" | "right" | "middle");

        await sleep(1000);
        const screenshot = await printScreen();
        if (screenshot) {
          await app.client.files.uploadV2({
            channel_id: msg.channel,
            file: fs.createReadStream(screenshot),
            filename: screenshot,
            title: `Clicked ${input} mouse button`,
          });
        } else {
          await say("Failed to take screenshot after clicking mouse.");
        }
      }
    } else if (text === "restart") {
      votesForRestart++;
      if (votesForRestart >= VOTES_NEEDED) {
        await say(
          `Received ${votesForRestart}/${VOTES_NEEDED} votes for restart. Restarting VM...`,
        );
        votesForRestart = 0;
        await restartVm();
        const screenshot = await printScreen();
        if (screenshot) {
          await app.client.files.uploadV2({
            channel_id: msg.channel,
            file: fs.createReadStream(screenshot),
            filename: screenshot,
            title: `VM Restarted`,
          });
        }
      } else if (isOwner) {
        await say(`Admin restart triggered, restarting VM immediately.`);
        votesForRestart = 0;
        await restartVm();
        const screenshot = await printScreen();
        if (screenshot) {
          await app.client.files.uploadV2({
            channel_id: msg.channel,
            file: fs.createReadStream(screenshot),
            filename: screenshot,
            title: `VM Restarted by Admin`,
          });
        }
      } else {
        await say(
          `Received ${votesForRestart} votes for restart. Need ${
            VOTES_NEEDED - votesForRestart
          } more votes to restart.`,
        );
        isProcessing = false;
        return;
      }
    } else {
      if (text.startsWith("#")) {
        // ignore
        isProcessing = false;
        return;
      }
      if (text.startsWith("ban")) {
        // owner check
        if (!isOwner) {
          // ignore
          isProcessing = false;
          return;
        } else {
          // check if already banned
          const parts = text.split(" ");
          if (parts.length !== 2) {
            await say(`Usage: ban <user_id>`);
            isProcessing = false;
            return;
          }
          const userIdToBan = parts[1].trim().toUpperCase();
          if (bannedUsers.includes(userIdToBan)) {
            await say(`User ${userIdToBan} is already banned.`);
            isProcessing = false;
            return;
          }
          bannedUsers.push(userIdToBan);
          fs.writeFileSync(
            "./banned.json",
            JSON.stringify(bannedUsers, null, 2),
          );
          await say(`User ${userIdToBan} has been banned from using the bot.`);
          isProcessing = false;
          return;
        }
      }
      if (text.startsWith("unban")) {
        // owner check
        if (!isOwner) {
          // ignore
          isProcessing = false;
          return;
        } else {
          const parts = text.split(" ");
          if (parts.length !== 2) {
            await say(`Usage: unban <user_id>`);
            isProcessing = false;
            return;
          }
          const userIdToUnban = parts[1].trim().toUpperCase();
          if (!bannedUsers.includes(userIdToUnban)) {
            await say(`User ${userIdToUnban} is not banned.`);
            isProcessing = false;
            return;
          }
          const index = bannedUsers.indexOf(userIdToUnban);
          bannedUsers.splice(index, 1);
          fs.writeFileSync(
            "./banned.json",
            JSON.stringify(bannedUsers, null, 2),
          );
          await say(`User ${userIdToUnban} has been unbanned.`);
          isProcessing = false;
          return;
        }
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
  // init vm first
  await initVm();
  await app.start();
  console.log(`slack-vm running | ${new Date().toISOString()}`);
  app.client.chat.postMessage({
    channel: Bun.env.SLACK_CHANNEL_ID || "",
    text: `slack-vm is now online! || ${new Date().toDateString()}`,
  });
  isReady = true;
})();

process.on("SIGINT", async () => {
  console.log("Shutting down slack-vm...");
  await killVm();
  process.exit();
});
