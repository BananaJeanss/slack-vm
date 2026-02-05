export const KEY_MAP: Record<string, string> = {
  // --- Navigation & Control ---
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  pgup: "pgup",
  pgdn: "pgdn",
  home: "home",
  end: "end",
  ins: "insert",
  del: "delete",
  enter: "ret",
  return: "ret",
  "\n": "ret",
  esc: "esc",
  escape: "esc",
  space: "spc",
  spc: "spc",
  " ": "spc",
  tab: "tab",
  backspace: "backspace",
  caps: "caps_lock",
  shift: "shift",
  ctrl: "ctrl",
  alt: "alt",
  meta: "meta_l",
  win: "meta_l",
  cmd: "meta_l",

  // Function Keys
  f1: "f1",
  f2: "f2",
  f3: "f3",
  f4: "f4",
  f5: "f5",
  f6: "f6",
  f7: "f7",
  f8: "f8",
  f9: "f9",
  f10: "f10",
  f11: "f11",
  f12: "f12",

  // Special Keys

  // --- Standard Keys (Unshifted) ---
  ".": "dot",
  ",": "comma",
  "-": "minus",
  "=": "equal",
  "/": "slash",
  ";": "semicolon",
  "'": "apostrophe",
  "[": "bracket_left",
  "]": "bracket_right",
  "\\": "backslash",
  "`": "grave_accent",

  // --- The Missing "Shift Layer" Keys ---
  // Number Row
  "!": "shift-1",
  "@": "shift-2",
  "#": "shift-3",
  $: "shift-4",
  "%": "shift-5",
  "^": "shift-6",
  "&": "shift-7",
  "*": "shift-8",
  "(": "shift-9",
  ")": "shift-0",

  // Punctuation / Symbols
  _: "shift-minus",
  "+": "shift-equal",
  "{": "shift-bracket_left",
  "}": "shift-bracket_right",
  "|": "shift-backslash",
  ":": "shift-semicolon",
  '"': "shift-apostrophe",
  "<": "shift-comma",
  ">": "shift-dot",
  "?": "shift-slash",
  "~": "shift-grave_accent",
};

export function getQemuKey(input: string): string | null {
  // 1. Check exact match in the map first (Handles *, ?, <, space, etc.)
  if (KEY_MAP[input]) {
    return KEY_MAP[input];
  }

  // 2. Handle Case Sensitivity for Letters
  // If input is "A", we want "shift-a". If "a", we want "a".
  if (/^[a-zA-Z]$/.test(input)) {
    if (input === input.toUpperCase()) {
      return `shift-${input.toLowerCase()}`;
    }
    return input;
  }

  // 3. Handle Numbers (0-9)
  if (/^[0-9]$/.test(input)) {
    return input;
  }

  // 4. Fallback: Check lowercase match in map (e.g. user typed "ENTER" or "Enter")
  const lower = input.toLowerCase();
  if (KEY_MAP[lower]) {
    return KEY_MAP[lower];
  }

  return null;
}
