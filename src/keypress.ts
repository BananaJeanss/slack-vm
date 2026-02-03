import { sleep } from "bun";
import { QmpCommand } from "./command";
import { getQemuKey } from "./keymap";

export async function keyPress(key: string) {
  // doublecheck
  const qemuKey = getQemuKey(key);
  if (qemuKey === null) {
    console.warn(`Key "${key}" is not allowed.`);
    return null;
  }

  await QmpCommand("human-monitor-command", {
    "command-line": `sendkey ${qemuKey}`,
  });
}

export async function keyPressEnter(key: string) {
  // doublecheck
  const qemuKey = getQemuKey(key);
  if (qemuKey === null) {
    console.warn(`Key "${key}" is not allowed.`);
    return null;
  }

  await QmpCommand("human-monitor-command", {
    "command-line": `sendkey ${qemuKey}`,
  });
  // wait
  await sleep(150);
  await QmpCommand("human-monitor-command", {
    "command-line": `sendkey ${getQemuKey("enter")}`,
  });
}

export async function keyCombo(keys: string[]) {
  const qemuKeys: string[] = [];
  
  for (const key of keys) {
    const qemuKey = getQemuKey(key);
    if (qemuKey === null) {
      console.warn(`Key "${key}" is not allowed.`);
      return null;
    }
    qemuKeys.push(qemuKey);
  }

  const comboString = qemuKeys.join("-");

  await QmpCommand("human-monitor-command", {
    "command-line": `sendkey ${comboString}`,
  });
}

export async function keySequence(keys: string[], delay: number = 100) {
  for (const key of keys) {
    const qemuKey = getQemuKey(key);
    if (qemuKey === null) {
      console.warn(`Key "${key}" is not allowed.`);
      return null;
    }
    await QmpCommand("human-monitor-command", {
      "command-line": `sendkey ${qemuKey}`,
    });
    await sleep(delay);
  }
}
