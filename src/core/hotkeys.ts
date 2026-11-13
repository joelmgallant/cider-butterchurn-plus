export type HotkeyAction = "random" | "prev" | "lock" | "favorite" | "block" | "hud" | "help" | "close";

export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target?: unknown;
}

const KEY_ACTIONS: Readonly<Record<string, HotkeyAction>> = {
  n: "random",
  p: "prev",
  l: "lock",
  f: "favorite",
  b: "block",
  h: "hud",
  "?": "help",
  escape: "close",
};

export const HOTKEY_HELP: ReadonlyArray<{ keys: string; action: HotkeyAction; label: string }> = [
  { keys: "N", action: "random", label: "Next (random) preset" },
  { keys: "P", action: "prev", label: "Previous preset" },
  { keys: "L", action: "lock", label: "Lock / unlock current preset" },
  { keys: "F", action: "favorite", label: "Toggle favourite" },
  { keys: "B", action: "block", label: "Blocklist current preset and skip" },
  { keys: "H", action: "hud", label: "Show / hide preset name" },
  { keys: "?", action: "help", label: "Show / hide this list" },
  { keys: "Esc", action: "close", label: "Close this list" },
];

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableTarget(target: unknown): boolean {
  if (typeof target !== "object" || target === null) return false;
  const element = target as { tagName?: unknown; isContentEditable?: unknown };
  if (element.isContentEditable === true) return true;
  return typeof element.tagName === "string" && EDITABLE_TAGS.has(element.tagName.toUpperCase());
}

export function hotkeyAction(event: KeyLike): HotkeyAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isEditableTarget(event.target)) return null;
  return KEY_ACTIONS[event.key.toLowerCase()] ?? null;
}
