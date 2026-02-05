import type { CommandModule } from "../types";
import { vmUpSince } from "../init";

const uptimeCommand: CommandModule = {
  trigger: ["uptime"],
  handler: async (args, say) => {
    const uptimeMs = process.uptime() * 1000;
    const uptimeDays = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const uptimeHours = Math.floor(
      (uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const uptimeMinutes = Math.floor(
      (uptimeMs % (1000 * 60 * 60)) / (1000 * 60),
    );
    const uptimeSeconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);

    const vmUptimeMs = Date.now() - vmUpSince;
    const vmUptimeDays = Math.floor(vmUptimeMs / (1000 * 60 * 60 * 24));
    const vmUptimeHours = Math.floor(
      (vmUptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const vmUptimeMinutes = Math.floor(
      (vmUptimeMs % (1000 * 60 * 60)) / (1000 * 60),
    );
    const vmUptimeSeconds = Math.floor((vmUptimeMs % (1000 * 60)) / 1000);

    await say(
      `Bun uptime: ${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s\nVM uptime: ${vmUptimeDays}d ${vmUptimeHours}h ${vmUptimeMinutes}m ${vmUptimeSeconds}s`,
    );
  },
};
export default uptimeCommand;
