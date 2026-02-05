import { sleep } from "bun";
import { QmpCommand } from "./command";
import { getQemuKey } from "./keymap";

// testing cause ts doesnt work in undertale for some reason
const HOLD_MS = 50;

export async function keyPress(key: string) {
  const qemuKey = getQemuKey(key);
  if (qemuKey === null) {
    console.warn(`Key "${key}" is not allowed.`);
    return null;
  }

  await QmpCommand("human-monitor-command", {
    "command-line": `sendkey ${qemuKey} ${HOLD_MS}`,
  });
}

export async function keyPressEnter(key: string) {
  const qemuKey = getQemuKey(key);
  if (qemuKey === null) return null;

  await QmpCommand("human-monitor-command", {
    "command-line": `sendkey ${qemuKey} ${HOLD_MS}`,
  });

  await sleep(100);

  await QmpCommand("human-monitor-command", {
    "command-line": `sendkey ret ${HOLD_MS}`,
  });
}

export async function keyCombo(keys: string[]) {
  const qemuKeys = keys.map(getQemuKey).filter((k) => k !== null);
  const comboString = qemuKeys.join("-");

  await QmpCommand("human-monitor-command", {
    "command-line": `sendkey ${comboString} ${HOLD_MS}`,
  });
}

export async function keySequence(keys: string[], delay: number = 100) {
  for (const key of keys) {
    const qemuKey = getQemuKey(key);
    if (qemuKey === null) continue;

    await QmpCommand("human-monitor-command", {
      "command-line": `sendkey ${qemuKey} ${HOLD_MS}`,
    });

    await sleep(delay);
  }
}
