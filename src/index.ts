import { App } from "@slack/bolt";
import initVm, { killVm } from "./init";
import printScreen from "./print";
import fs from "fs";

const app = new App({
  socketMode: true,
  appToken: Bun.env.SLACK_APP_TOKEN,
  signingSecret: Bun.env.SLACK_SIGNING_SECRET,
  token: Bun.env.SLACK_BOT_TOKEN,
});

let isReady = false;
let isProcessing = false;
app.message("", async ({ message, say }) => {
  if (!isReady || isProcessing) return; // not ready yet
  // check that it's in the set channel
  if ((message as any).channel !== Bun.env.SLACK_CHANNEL_ID) {
    return;
  }
  isProcessing = true;
  if ((message as any).text?.includes("print")) {
    const filename = await printScreen();
    if (filename) {
      await app.client.files.uploadV2({
        channel_id: Bun.env.SLACK_CHANNEL_ID || "",
        file: fs.createReadStream(`${filename}`),
        filename: filename,
        title: `VM Screenshot | ${new Date().toISOString()}`,
      });
    } else {
      await say("Failed to take screenshot.");
    }
    isProcessing = false;
    return;
  }

  isProcessing = false;
  await say(`Unknown command.`);
});

(async () => {
  // init vm first
  await initVm();
  await app.start();
  console.log(`slack-vm running | ${new Date().toISOString()}`);
  app.client.chat.postMessage({
    channel: Bun.env.SLACK_CHANNEL_ID || "",
    text: "slack-vm is now online!",
  });
  isReady = true;
})();

process.on("SIGINT", async () => {
  console.log("Shutting down slack-vm...");
  await killVm();
  process.exit();
});
