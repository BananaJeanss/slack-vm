import fs from "fs";
import { reactWith } from "../commandtools";
import type { CommandModule } from "../types";

const banCommand: CommandModule = {
  trigger: ["ban", "unban"],
  handler: async (args, say, msg, app) => {
    const commandName = msg.text?.trim().split(" ")[0].toLowerCase() || "";
    const targetUserId = args[0] ? args[0].trim().toUpperCase() : null;

    const isOwner = msg.user === Bun.env.SLACK_BOTADMIN_USERID;
    if (!isOwner) {
      reactWith("no_entry_sign", msg, app.client);
      return;
    }

    if (!targetUserId) {
      await say(`Usage: ${commandName} <user_id>`);
      return;
    }

    const banFile = "./banned.json";
    let bannedUsers: string[] = [];
    if (fs.existsSync(banFile)) {
      bannedUsers = JSON.parse(fs.readFileSync(banFile, "utf-8"));
    }

    if (commandName === "ban") {
      if (bannedUsers.includes(targetUserId)) {
        await say(`User ${targetUserId} is already banned.`);
      } else {
        bannedUsers.push(targetUserId);
        fs.writeFileSync(banFile, JSON.stringify(bannedUsers, null, 2));
        await say(`User ${targetUserId} has been banned.`);
      }
    } else if (commandName === "unban") {
      if (!bannedUsers.includes(targetUserId)) {
        await say(`User ${targetUserId} is not banned.`);
      } else {
        bannedUsers = bannedUsers.filter((id) => id !== targetUserId);
        fs.writeFileSync(banFile, JSON.stringify(bannedUsers, null, 2));
        await say(`User ${targetUserId} has been unbanned.`);
      }
    }
  },
};

export default banCommand;
