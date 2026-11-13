import { describe, expect, it } from "vitest";
import { HOTKEY_HELP, hotkeyAction } from "../src/core/hotkeys";

function key(k: string, extra: Record<string, unknown> = {}) {
  return { key: k, ctrlKey: false, metaKey: false, altKey: false, target: { tagName: "BODY" }, ...extra };
}

describe("hotkeyAction", () => {
  it.each([
    ["n", "random"],
    ["N", "random"],
    ["p", "prev"],
    ["l", "lock"],
    ["f", "favorite"],
    ["b", "block"],
    ["h", "hud"],
    ["?", "help"],
    ["Escape", "close"],
  ])("maps %s to %s", (k, action) => {
    expect(hotkeyAction(key(k))).toBe(action);
  });

  it("ignores unbound keys and arrows", () => {
    expect(hotkeyAction(key("x"))).toBeNull();
    expect(hotkeyAction(key("ArrowRight"))).toBeNull();
    expect(hotkeyAction(key(" "))).toBeNull();
  });

  it("ignores modified keys", () => {
    expect(hotkeyAction(key("n", { metaKey: true }))).toBeNull();
    expect(hotkeyAction(key("n", { ctrlKey: true }))).toBeNull();
    expect(hotkeyAction(key("n", { altKey: true }))).toBeNull();
  });

  it("allows shift for ?", () => {
    expect(hotkeyAction(key("?", { shiftKey: true }))).toBe("help");
  });

  it("ignores typing in editable elements", () => {
    expect(hotkeyAction(key("n", { target: { tagName: "INPUT" } }))).toBeNull();
    expect(hotkeyAction(key("n", { target: { tagName: "TEXTAREA" } }))).toBeNull();
    expect(hotkeyAction(key("n", { target: { tagName: "SELECT" } }))).toBeNull();
    expect(hotkeyAction(key("n", { target: { tagName: "DIV", isContentEditable: true } }))).toBeNull();
  });

  it("documents every action in the help list", () => {
    const actions = new Set(HOTKEY_HELP.map((entry) => entry.action));
    for (const action of ["random", "prev", "lock", "favorite", "block", "hud", "help"]) {
      expect(actions.has(action as never)).toBe(true);
    }
  });
});
