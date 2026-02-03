const KEY_MAP: Record<string, string> = {
  // Navigation
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
  enter: "ret",
  return: "ret",
  esc: "esc",
  escape: "esc",
  space: "spc",
  spc: "spc",
  tab: "tab",
  backspace: "backspace",
  caps: "caps_lock",

  // Modifiers
  shift: "shift",
  ctrl: "ctrl",
  alt: "alt",
  meta: "meta_l", // Windows/Cmd key
  win: "meta_l",

  // Punctuation that needs names in QEMU
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
  '"': "quote_double",
};

const ALLOWED_KEYS = [...Object.keys(KEY_MAP), "a-z", "0-9"];

export function getQemuKey(input: string): string | null {
  const normalized = input.toLowerCase().trim();

  if (input === " ") {
    return "spc";
  }

  if (KEY_MAP[normalized]) {
    return KEY_MAP[normalized];
  }

  if (/^[a-z0-9]$/.test(normalized)) {
    return normalized;
  }

  return null;
}
