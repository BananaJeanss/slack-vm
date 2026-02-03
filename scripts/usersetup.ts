// sets up a underprivileged user & iptables rules for that user for qemu networking

import { execSync } from "child_process";
import os from "os";
import path from "path";

const CONFIG = {
  USERNAME: "slackvm",
  SHELL: "/sbin/nologin",
  BLOCKED_SUBNET: "192.168.0.0/16",
};

function execute(command: string, ignoreErrors = false) {
  try {
    return execSync(command, { stdio: "pipe" }).toString().trim();
  } catch (error) {
    if (!ignoreErrors) throw error;
    return null;
  }
}

function setupUser() {
  const { USERNAME, SHELL, BLOCKED_SUBNET } = CONFIG;
  let uid;

  // check/create user
  try {
    uid = execute(`id -u ${USERNAME}`);
    console.log(
      `User ${USERNAME} already exists (UID: ${uid}). Skipping creation.`,
    );
  } catch {
    // does not exist, create
    console.log(`Creating user ${USERNAME}...`);
    execute(`useradd -r -M -s ${SHELL} ${USERNAME}`);
    uid = execute(`id -u ${USERNAME}`);
    console.log(`User ${USERNAME} (${uid}) created.`);
  }

  // setup Iptables
  console.log("Configuring iptables rules...");
  const rule = `OUTPUT -m owner --uid-owner ${uid} -d ${BLOCKED_SUBNET} -j REJECT`;
  try {
    // if exists, do nothing
    execute(`iptables -C ${rule}`);
    console.log("Iptables rule already exists. Skipping.");
  } catch {
    // does not exist, add it
    try {
      execute(`iptables -A ${rule}`);
      console.log(
        `Iptables rule added: Block ${USERNAME} from ${BLOCKED_SUBNET}`,
      );
    } catch (e: any) {
      console.error("Failed to set iptables rule:", e.message);
      process.exit(1);
    }
  }

  // finally configure ACL to allow user to access project dir
  setupPermissions();

  console.log("Setup complete.");
}

function setupPermissions() {
  const { USERNAME } = CONFIG;
  const projectDir = process.cwd();

  console.log(`Setting ACLs for ${projectDir}...`);

  try {
    execute("which setfacl");
  } catch {
    console.error("Error: 'acl' package is missing (setfacl not found).");
    process.exit(1);
  }

  try {
    // apply to existing files
    execute(`setfacl -R -m u:${USERNAME}:rwX "${projectDir}"`);

    // default for future files
    execute(`setfacl -R -d -m u:${USERNAME}:rwX "${projectDir}"`);

    console.log(`ACLs set for current and future files in ${projectDir}`);

    // so that the user can traverse parent directories
    let currentPath = projectDir;
    while (currentPath !== "/") {
      currentPath = path.dirname(currentPath);
      execute(`setfacl -m u:${USERNAME}:x "${currentPath}"`);
    }
    console.log("Parent directory traversal permissions granted via ACL.");
  } catch (e: any) {
    console.error("Failed to set permissions:", e.message);
    process.exit(1);
  }
}

function init() {
  if (os.platform() !== "linux") {
    console.error("ts pmo this is linux only 💀");
    process.exit(1);
  }

  if (process.getuid?.() !== 0) {
    console.error(
      "You need to run this script as root/sudo to setup the user and iptables rules.",
    );
    process.exit(1);
  }

  setupUser();
}

init();
