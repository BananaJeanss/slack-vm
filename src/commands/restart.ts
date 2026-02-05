import { restartVm } from "../init";
import fs from "fs";
import printScreen from "../print";

let votesForRestart: { userId: string; timestamp: number }[] = [];
let isProcessing = false;
const VOTES_NEEDED = Number(Bun.env.RESTART_VOTES_NEEDED) || 3;

function addVote(userId: string): boolean {
  const existingVote = votesForRestart.find((vote) => vote.userId === userId);
  if (existingVote) {
    return false; // already voted
  } else {
    votesForRestart.push({ userId, timestamp: Date.now() });
    return true; // vote added
  }
}

function clearAllVotes() {
  votesForRestart = [];
}

export default {
  trigger: ["restart"],
  handler: async (args: string[], say: any, msg: any, app: any) => {
    const isOwner = msg.user === Bun.env.SLACK_BOTADMIN_USERID;
    if (isOwner) {
      await say(`Admin restart triggered, restarting VM immediately.`);
      clearAllVotes();
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
      return;
    }

    const voteAdded = addVote(msg.user);
    if (!voteAdded) {
      await say(`You have already voted for a restart.`);
      isProcessing = false;
      return;
    }
    if (votesForRestart.length >= VOTES_NEEDED) {
      await say(
        `Received ${votesForRestart.length}/${VOTES_NEEDED} votes for restart. Restarting VM...`,
      );
      clearAllVotes();
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
    } else {
      await say(
        `Received ${votesForRestart.length} votes for restart. Need ${
          VOTES_NEEDED - votesForRestart.length
        } more votes to restart.`,
      );
      isProcessing = false;
      return;
    }
  },
};
